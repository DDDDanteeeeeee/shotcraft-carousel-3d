const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const concat = (parts) => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const makeHeader = (size, writer) => {
  const bytes = new Uint8Array(size);
  writer(new DataView(bytes.buffer));
  return bytes;
};

const dosDateTime = (date = new Date()) => ({
  time: ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f),
  date: (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f),
});

export function encodeZip(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('ZIP requires at least one file.');

  const localParts = [];
  const centralParts = [];
  const timestamp = dosDateTime();
  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(String(file.path).replaceAll('\\', '/'));
    const data = file.data instanceof Uint8Array ? file.data : encoder.encode(String(file.data || ''));
    const checksum = crc32(data);
    const flags = 0x0800;

    const localHeader = makeHeader(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, flags, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, timestamp.time, true);
      view.setUint16(12, timestamp.date, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, name.length, true);
      view.setUint16(28, 0, true);
    });
    localParts.push(localHeader, name, data);

    const centralHeader = makeHeader(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, flags, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, timestamp.time, true);
      view.setUint16(14, timestamp.date, true);
      view.setUint32(16, checksum, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, name.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, localOffset, true);
    });
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = concat(centralParts);
  const end = makeHeader(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralDirectory.length, true);
    view.setUint32(16, localOffset, true);
    view.setUint16(20, 0, true);
  });

  return concat([...localParts, centralDirectory, end]);
}

export function downloadZip(name, files) {
  const bytes = encodeZip(files);
  const url = URL.createObjectURL(new Blob([bytes], {type: 'application/zip'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.zip`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
