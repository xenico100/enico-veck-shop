/**
 * Small, static glTF 2 GLB reader for the approved web export.
 * No network resources inside the GLB are followed. Skins, animations, morphs,
 * compression and UV-transform extensions must be baked before export.
 */
type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];
type Matrix = number[];
export type WorldGlbMaterial = {
  baseColorFactor: Vec4;
  emissiveFactor: Vec3;
  emissiveStrength: number;
  unlit: boolean;
  textureIndex: number | null;
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
  alphaCutoff: number;
  doubleSided: boolean;
};
export type WorldGlbBatch = {
  /** xyz, normal xyz, uv, color rgba: 12 floats / 48 bytes per vertex. */
  vertices: Float32Array;
  vertexCount: number;
  material: WorldGlbMaterial;
};
export type WorldGlbTexture = {
  image: ImageBitmap;
  wrapS: number;
  wrapT: number;
  minFilter: number;
  magFilter: number;
};
export type WorldGlbScene = {
  batches: WorldGlbBatch[];
  textures: WorldGlbTexture[];
  bounds: { min: Vec3; max: Vec3 };
  triangleCount: number;
  stats: {
    nodeCount: number;
    meshInstances: number;
    primitiveCount: number;
    materialCount: number;
    textureCount: number;
  };
  dispose(): void;
};
type LoadOptions = { signal?: AbortSignal };
type Accessor = {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
  sparse?: unknown;
};
type BufferView = {
  buffer?: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
};
type Primitive = {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
  targets?: unknown;
  extensions?: Record<string, unknown>;
};
type Node = {
  mesh?: number;
  skin?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};
type Material = {
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: {
      index: number;
      texCoord?: number;
      extensions?: Record<string, unknown>;
    };
  };
  emissiveFactor?: number[];
  extensions?: {
    KHR_materials_emissive_strength?: { emissiveStrength?: number };
    KHR_materials_unlit?: unknown;
  };
  alphaMode?: string;
  alphaCutoff?: number;
  doubleSided?: boolean;
};
type GlbDocument = {
  asset?: { version?: string };
  buffers?: { uri?: string; byteLength: number }[];
  bufferViews?: BufferView[];
  accessors?: Accessor[];
  meshes?: { primitives: Primitive[] }[];
  nodes?: Node[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
  materials?: Material[];
  textures?: { source?: number; sampler?: number }[];
  images?: { bufferView?: number; mimeType?: string; uri?: string }[];
  samplers?: {
    wrapS?: number;
    wrapT?: number;
    minFilter?: number;
    magFilter?: number;
  }[];
  extensionsRequired?: string[];
  animations?: unknown[];
  skins?: unknown[];
};

const MAX_BYTES = 64 * 1024 * 1024;
const MAX_VERTICES = 1_500_000;
const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const fail = (reason: string): never => {
  throw new Error(`정적 GLB 형식을 확인해 주세요: ${reason}`);
};
const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted)
    throw new DOMException('GLB loading aborted', 'AbortError');
};
const integer = (value: number | undefined, fallback = 0): number => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 0)
    return fail('잘못된 버퍼 범위');
  return result;
};
const finiteArray = (
  value: number[] | undefined,
  fallback: number[]
): number[] => {
  if (!value) return fallback;
  if (value.length !== fallback.length || !value.every(Number.isFinite))
    return fail('잘못된 노드 변환');
  return value;
};
function multiply(a: Matrix, b: Matrix): Matrix {
  const result = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++)
        result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  return result;
}
function nodeMatrix(node: Node): Matrix {
  if (node.matrix) return finiteArray(node.matrix, IDENTITY);
  const t = finiteArray(node.translation, [0, 0, 0]);
  const s = finiteArray(node.scale, [1, 1, 1]);
  const q = finiteArray(node.rotation, [0, 0, 0, 1]);
  const length = Math.hypot(...q) || 1;
  const [x, y, z, w] = q.map((n) => n / length);
  return [
    (1 - 2 * (y * y + z * z)) * s[0],
    2 * (x * y + z * w) * s[0],
    2 * (x * z - y * w) * s[0],
    0,
    2 * (x * y - z * w) * s[1],
    (1 - 2 * (x * x + z * z)) * s[1],
    2 * (y * z + x * w) * s[1],
    0,
    2 * (x * z + y * w) * s[2],
    2 * (y * z - x * w) * s[2],
    (1 - 2 * (x * x + y * y)) * s[2],
    0,
    t[0],
    t[1],
    t[2],
    1
  ];
}
function transformPoint(m: Matrix, x: number, y: number, z: number): Vec3 {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}
function normalMatrix(m: Matrix): { values: number[]; mirrored: boolean } {
  const a = m[0],
    b = m[4],
    c = m[8],
    d = m[1],
    e = m[5],
    f = m[9],
    g = m[2],
    h = m[6],
    i = m[10];
  const values = [
    e * i - f * h,
    f * g - d * i,
    d * h - e * g,
    c * h - b * i,
    a * i - c * g,
    b * g - a * h,
    b * f - c * e,
    c * d - a * f,
    a * e - b * d
  ];
  const det = a * values[0] + b * values[1] + c * values[2];
  if (det < 0) for (let n = 0; n < values.length; n++) values[n] *= -1;
  return { values, mirrored: det < 0 };
}
function normalized(x: number, y: number, z: number): Vec3 {
  const length = Math.hypot(x, y, z);
  return length > 1e-12 ? [x / length, y / length, z / length] : [0, 1, 0];
}

/** Fetch one self-contained GLB; embedded assets never trigger additional fetches. */
export async function loadWorldGlb(
  url: string,
  options: LoadOptions = {}
): Promise<WorldGlbScene> {
  checkAbort(options.signal);
  const response = await fetch(url, {
    signal: options.signal,
    credentials: 'same-origin',
    cache: 'force-cache'
  });
  if (!response.ok)
    throw new Error(`마을 GLB를 불러오지 못했습니다 (${response.status}).`);
  const length = Number(response.headers.get('Content-Length'));
  if (length > MAX_BYTES) return fail('파일 크기 제한 초과');
  return parseWorldGlb(await response.arrayBuffer(), options);
}

/** Parse and merge static triangles by material; coordinates come from glTF nodes. */
export async function parseWorldGlb(
  buffer: ArrayBuffer,
  options: LoadOptions = {}
): Promise<WorldGlbScene> {
  checkAbort(options.signal);
  if (buffer.byteLength < 20 || buffer.byteLength > MAX_BYTES)
    return fail('파일 크기');
  const view = new DataView(buffer);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== buffer.byteLength
  )
    return fail('GLB 2 헤더');
  let document: GlbDocument | undefined;
  let binary: ArrayBuffer | undefined;
  for (let offset = 12; offset < buffer.byteLength; ) {
    if (offset + 8 > buffer.byteLength) return fail('잘린 청크');
    const length = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > buffer.byteLength)
      return fail('청크 범위');
    const chunk = buffer.slice(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) {
      if (document) return fail('중복 JSON 청크');
      document = JSON.parse(
        new TextDecoder().decode(chunk).trim()
      ) as GlbDocument;
    } else if (type === 0x004e4942) {
      if (binary) return fail('중복 BIN 청크');
      binary = chunk;
    }
    offset += 8 + length;
  }
  if (!document || !binary || document.asset?.version !== '2.0')
    return fail('필수 GLB 데이터');
  const doc = document,
    bin = binary;
  if (
    doc.buffers?.length !== 1 ||
    doc.buffers[0].uri ||
    doc.buffers[0].byteLength > bin.byteLength
  )
    return fail('내장 BIN만 지원');
  if (doc.animations?.length || doc.skins?.length)
    return fail('정적 메시로 내보내기 필요');
  const allowedExtensions = new Set([
    'KHR_materials_unlit',
    'KHR_materials_emissive_strength'
  ]);
  if (
    doc.extensionsRequired?.some(
      (extension) => !allowedExtensions.has(extension)
    )
  )
    return fail('압축 또는 지원하지 않는 확장');
  if ((doc.textures?.length ?? 0) > 128 || (doc.images?.length ?? 0) > 128)
    return fail('텍스처 개수 제한');

  const bufferRange = (index: number) => {
    const descriptor = doc.bufferViews?.[index];
    if (!descriptor || (descriptor.buffer ?? 0) !== 0)
      return fail('bufferView');
    const offset = integer(descriptor.byteOffset),
      length = integer(descriptor.byteLength);
    if (offset + length > bin.byteLength) return fail('bufferView 범위');
    return { descriptor, offset, length };
  };
  const accessorCache = new Map<
    number,
    { values: Float32Array; components: number; count: number }
  >();
  const readAccessor = (index: number) => {
    const cached = accessorCache.get(index);
    if (cached) return cached;
    const accessor = doc.accessors?.[index];
    if (!accessor || accessor.bufferView === undefined || accessor.sparse)
      return fail('희소 또는 누락 accessor');
    const components = (
      { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>
    )[accessor.type];
    const bytes = (
      { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 } as Record<
        number,
        number
      >
    )[accessor.componentType];
    const count = integer(accessor.count);
    if (!components || !bytes || count > MAX_VERTICES * 3)
      return fail('accessor 형식 또는 크기');
    const range = bufferRange(accessor.bufferView);
    const stride = range.descriptor.byteStride ?? components * bytes;
    const offset = integer(accessor.byteOffset);
    if (
      !Number.isSafeInteger(stride) ||
      stride < components * bytes ||
      offset + (count ? (count - 1) * stride + components * bytes : 0) >
        range.length
    )
      return fail('accessor 범위');
    const data = new DataView(bin, range.offset, range.length);
    const values = new Float32Array(count * components);
    for (let n = 0; n < count; n++)
      for (let c = 0; c < components; c++) {
        const position = offset + n * stride + c * bytes;
        let value: number;
        switch (accessor.componentType) {
          case 5120:
            value = data.getInt8(position);
            if (accessor.normalized) value = Math.max(value / 127, -1);
            break;
          case 5121:
            value = data.getUint8(position);
            if (accessor.normalized) value /= 255;
            break;
          case 5122:
            value = data.getInt16(position, true);
            if (accessor.normalized) value = Math.max(value / 32767, -1);
            break;
          case 5123:
            value = data.getUint16(position, true);
            if (accessor.normalized) value /= 65535;
            break;
          case 5125:
            value = data.getUint32(position, true);
            break;
          default:
            value = data.getFloat32(position, true);
        }
        if (!Number.isFinite(value)) return fail('유한하지 않은 정점');
        values[n * components + c] = value;
      }
    const result = { values, components, count };
    accessorCache.set(index, result);
    return result;
  };
  const material = (index: number): WorldGlbMaterial => {
    const source = index < 0 ? undefined : doc.materials?.[index];
    if (index >= 0 && !source) return fail('재질 참조');
    const color = source?.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
    if (color.length !== 4 || !color.every(Number.isFinite))
      return fail('재질 색상');
    const emissive = source?.emissiveFactor ?? [0, 0, 0];
    const strength =
      source?.extensions?.KHR_materials_emissive_strength?.emissiveStrength ??
      1;
    if (
      emissive.length !== 3 ||
      !emissive.every(Number.isFinite) ||
      !Number.isFinite(strength) ||
      strength < 0
    )
      return fail('발광 재질');
    const texture = source?.pbrMetallicRoughness?.baseColorTexture;
    if (
      texture?.extensions?.KHR_texture_transform ||
      (texture?.texCoord ?? 0) !== 0
    )
      return fail('UV 변환을 TEXCOORD_0에 굽기 필요');
    if (texture && !doc.textures?.[texture.index]) return fail('텍스처 참조');
    return {
      baseColorFactor: color as Vec4,
      emissiveFactor: emissive as Vec3,
      emissiveStrength: strength,
      unlit: source?.extensions?.KHR_materials_unlit !== undefined,
      textureIndex: texture?.index ?? null,
      alphaMode:
        source?.alphaMode === 'BLEND'
          ? 'BLEND'
          : source?.alphaMode === 'MASK'
            ? 'MASK'
            : 'OPAQUE',
      alphaCutoff: source?.alphaCutoff ?? 0.5,
      doubleSided: source?.doubleSided ?? false
    };
  };
  const groups = new Map<
    number,
    { chunks: Float32Array[]; count: number; material: WorldGlbMaterial }
  >();
  const min: Vec3 = [Infinity, Infinity, Infinity],
    max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let totalVertices = 0;
  let nodeCount = 0,
    meshInstances = 0,
    primitiveCount = 0;
  const appendPrimitive = (primitive: Primitive, world: Matrix) => {
    primitiveCount++;
    if (
      (primitive.mode ?? 4) !== 4 ||
      primitive.targets ||
      primitive.extensions?.KHR_draco_mesh_compression
    )
      return fail('비압축 정적 삼각형만 지원');
    const position = readAccessor(primitive.attributes.POSITION);
    if (position.components !== 3) return fail('POSITION VEC3');
    const normal =
      primitive.attributes.NORMAL === undefined
        ? undefined
        : readAccessor(primitive.attributes.NORMAL);
    const uv =
      primitive.attributes.TEXCOORD_0 === undefined
        ? undefined
        : readAccessor(primitive.attributes.TEXCOORD_0);
    const color =
      primitive.attributes.COLOR_0 === undefined
        ? undefined
        : readAccessor(primitive.attributes.COLOR_0);
    for (const [attribute, components] of [
      [normal, 3],
      [uv, 2]
    ] as const) {
      if (
        attribute &&
        (attribute.components !== components ||
          attribute.count !== position.count)
      )
        return fail('정점 속성 크기');
    }
    if (
      color &&
      (![3, 4].includes(color.components) || color.count !== position.count)
    )
      return fail('COLOR_0 크기');
    const indices =
      primitive.indices === undefined
        ? undefined
        : readAccessor(primitive.indices);
    if (indices && indices.components !== 1) return fail('인덱스 형식');
    const vertexCount = indices?.count ?? position.count;
    totalVertices += vertexCount;
    if (vertexCount % 3 || totalVertices > MAX_VERTICES)
      return fail('삼각형 개수 또는 정점 제한');
    const data = new Float32Array(vertexCount * 12);
    const nm = normalMatrix(world);
    for (let triangle = 0; triangle < vertexCount; triangle += 3) {
      const order = nm.mirrored ? [0, 2, 1] : [0, 1, 2];
      const sourceIndices = order.map(
        (corner) => indices?.values[triangle + corner] ?? triangle + corner
      );
      const points = sourceIndices.map((index) => {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= position.count
        )
          return fail('인덱스 범위');
        return transformPoint(
          world,
          position.values[index * 3],
          position.values[index * 3 + 1],
          position.values[index * 3 + 2]
        );
      });
      const a = points[0],
        b = points[1],
        c = points[2];
      const face = normalized(
        (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
        (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      );
      for (let corner = 0; corner < 3; corner++) {
        const index = sourceIndices[corner],
          point = points[corner],
          out = (triangle + corner) * 12;
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], point[axis]);
          max[axis] = Math.max(max[axis], point[axis]);
        }
        let n = face;
        if (normal) {
          const x = normal.values[index * 3],
            y = normal.values[index * 3 + 1],
            z = normal.values[index * 3 + 2],
            m = nm.values;
          n = normalized(
            m[0] * x + m[1] * y + m[2] * z,
            m[3] * x + m[4] * y + m[5] * z,
            m[6] * x + m[7] * y + m[8] * z
          );
        }
        data.set(point, out);
        data.set(n, out + 3);
        data[out + 6] = uv?.values[index * 2] ?? 0;
        data[out + 7] = uv?.values[index * 2 + 1] ?? 0;
        for (let channel = 0; channel < 4; channel++)
          data[out + 8 + channel] =
            color && channel < color.components
              ? color.values[index * color.components + channel]
              : 1;
      }
    }
    const key = primitive.material ?? -1;
    let group = groups.get(key);
    if (!group) {
      group = { chunks: [], count: 0, material: material(key) };
      groups.set(key, group);
    }
    if (group.material.textureIndex !== null && !uv)
      return fail('텍스처 재질에 TEXCOORD_0 필요');
    group.chunks.push(data);
    group.count += vertexCount;
  };
  const path = new Set<number>();
  const visit = (index: number, parent: Matrix) => {
    checkAbort(options.signal);
    const node = doc.nodes?.[index];
    if (!node || path.has(index)) return fail('노드 참조 또는 순환');
    if (node.skin !== undefined)
      return fail('리그를 정적 메시로 내보내기 필요');
    nodeCount++;
    path.add(index);
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = doc.meshes?.[node.mesh];
      if (!mesh) return fail('메시 참조');
      meshInstances++;
      for (const primitive of mesh.primitives)
        appendPrimitive(primitive, world);
    }
    for (const child of node.children ?? []) visit(child, world);
    path.delete(index);
  };
  const scene = doc.scenes?.[doc.scene ?? 0];
  let roots = scene?.nodes;
  if (!roots) {
    const children = new Set(
      doc.nodes?.flatMap((node) => node.children ?? []) ?? []
    );
    roots = (doc.nodes ?? [])
      .map((_, index) => index)
      .filter((index) => !children.has(index));
  }
  for (const root of roots) visit(root, IDENTITY);
  if (!totalVertices) return fail('장면에 정적 삼각형 없음');
  const batches: WorldGlbBatch[] = Array.from(groups.values()).map((group) => {
    const vertices = new Float32Array(group.count * 12);
    let offset = 0;
    for (const chunk of group.chunks) {
      vertices.set(chunk, offset);
      offset += chunk.length;
    }
    return { vertices, vertexCount: group.count, material: group.material };
  });
  const textures: WorldGlbTexture[] = [];
  const images = new Map<number, ImageBitmap>();
  let decodedPixels = 0;
  try {
    for (const source of doc.textures ?? []) {
      checkAbort(options.signal);
      const imageIndex = source.source;
      if (imageIndex === undefined) return fail('텍스처 이미지 참조');
      let image = images.get(imageIndex);
      if (!image) {
        const sourceImage = doc.images?.[imageIndex];
        if (
          !sourceImage ||
          sourceImage.uri ||
          sourceImage.bufferView === undefined ||
          sourceImage.mimeType !== 'image/png'
        )
          return fail('내장 PNG만 지원');
        const range = bufferRange(sourceImage.bufferView);
        const png = bin.slice(range.offset, range.offset + range.length);
        if (png.byteLength < 24) return fail('PNG 헤더');
        const header = new DataView(png);
        if (
          header.getUint32(0) !== 0x89504e47 ||
          header.getUint32(4) !== 0x0d0a1a0a ||
          header.getUint32(16) > 4096 ||
          header.getUint32(20) > 4096
        )
          return fail('PNG 크기 또는 형식');
        decodedPixels += header.getUint32(16) * header.getUint32(20);
        if (decodedPixels > 32 * 1024 * 1024)
          return fail('전체 텍스처 픽셀 제한');
        if (typeof createImageBitmap !== 'function')
          throw new Error('이 브라우저에서는 마을 텍스처를 읽을 수 없습니다.');
        image = await createImageBitmap(
          new Blob([png], { type: 'image/png' }),
          {
            imageOrientation: 'none',
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none'
          }
        );
        images.set(imageIndex, image);
      }
      const sampler =
        source.sampler === undefined
          ? undefined
          : doc.samplers?.[source.sampler];
      textures.push({
        image,
        wrapS: sampler?.wrapS ?? 10497,
        wrapT: sampler?.wrapT ?? 10497,
        minFilter: sampler?.minFilter ?? 9728,
        magFilter: sampler?.magFilter ?? 9728
      });
    }
    checkAbort(options.signal);
  } catch (error) {
    for (const image of Array.from(images.values())) image.close();
    throw error;
  }
  let disposed = false;
  return {
    batches,
    textures,
    bounds: { min, max },
    triangleCount: totalVertices / 3,
    stats: {
      nodeCount,
      meshInstances,
      primitiveCount,
      materialCount: groups.size,
      textureCount: textures.length
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        for (const image of Array.from(images.values())) image.close();
      }
    }
  };
}
