/** Port of org.apache.kafka.common.utils.Utils.murmur2 (the default partitioner hash for keyed records). */
export function murmur2(data: Uint8Array): number {
  const length = data.length;
  const seed = 0x9747b28c;
  const m = 0x5bd1e995;
  const r = 24;
  let h = seed ^ length;
  const length4 = length >> 2;
  for (let i = 0; i < length4; i++) {
    const i4 = i * 4;
    let k = (data[i4] & 0xff) | ((data[i4 + 1] & 0xff) << 8) | ((data[i4 + 2] & 0xff) << 16) | ((data[i4 + 3] & 0xff) << 24);
    k = Math.imul(k, m);
    k ^= k >>> r;
    k = Math.imul(k, m);
    h = Math.imul(h, m);
    h ^= k;
  }
  switch (length % 4) {
    case 3:
      h ^= (data[(length & ~3) + 2] & 0xff) << 16;
    // falls through
    case 2:
      h ^= (data[(length & ~3) + 1] & 0xff) << 8;
    // falls through
    case 1:
      h ^= data[length & ~3] & 0xff;
      h = Math.imul(h, m);
  }
  h ^= h >>> 13;
  h = Math.imul(h, m);
  h ^= h >>> 15;
  return h | 0;
}

/** Partition chosen by Kafka's default partitioner for a non-null key. */
export function partitionFor(key: string, partitions: number): number {
  const h = murmur2(new TextEncoder().encode(key));
  return (h & 0x7fffffff) % partitions;
}
