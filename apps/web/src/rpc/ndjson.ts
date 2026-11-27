import * as RpcSerialization from "effect/rpc/RpcSerialization";

const effectNdjson = RpcSerialization.makeNdjson();

const parseLine = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch (cause) {
    throw new RpcSerialization.NdjsonDecodeError({ cause });
  }
};

const lineParser = (maxLineLength: number): RpcSerialization.Parser => {
  const decoder = new TextDecoder();
  let pieces: Array<string> = [];
  let pending = 0;
  const keep = (piece: string) => {
    pending += piece.length;
    if (pending > maxLineLength) {
      pieces = [];
      pending = 0;
      throw new RpcSerialization.MaxBufferSizeExceeded({ maxBufferSize: maxLineLength });
    }
    pieces.push(piece);
  };
  return {
    encode: effectNdjson.makeUnsafe().encode,
    decode: (data) => {
      const text = typeof data === "string" ? data : decoder.decode(data, { stream: true });
      const items: Array<unknown> = [];
      let start = 0;
      for (let end = text.indexOf("\n"); end !== -1; end = text.indexOf("\n", start)) {
        keep(text.slice(start, end));
        const line = pieces.join("");
        pieces = [];
        pending = 0;
        const json = line.endsWith("\r") ? line.slice(0, -1) : line;
        if (json.length > 0) items.push(parseLine(json));
        start = end + 1;
      }
      if (start < text.length) keep(text.slice(start));
      return items;
    },
  };
};

export const linearNdjson = (maxLineLength: number): RpcSerialization.RpcSerialization["Service"] =>
  RpcSerialization.RpcSerialization.of({
    ...effectNdjson,
    makeUnsafe: () => lineParser(maxLineLength),
  });
