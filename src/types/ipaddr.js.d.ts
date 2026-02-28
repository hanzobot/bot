declare module "ipaddr.js" {
  interface IPv4 {
    octets: number[];
    range(): string;
    kind(): "ipv4";
    toIPv4MappedAddress(): IPv6;
    toString(): string;
    match(addr: IPv4 | IPv6, bits: number): boolean;
    match(pair: [IPv4 | IPv6, number]): boolean;
  }
  interface IPv6 {
    parts: number[];
    range(): string;
    kind(): "ipv6";
    isIPv4MappedAddress(): boolean;
    toIPv4Address(): IPv4;
    toString(): string;
    match(addr: IPv4 | IPv6, bits: number): boolean;
    match(pair: [IPv4 | IPv6, number]): boolean;
  }
  type ParsedAddress = IPv4 | IPv6;

  interface IPv4Constructor {
    new (octets: number[]): IPv4;
    parse(addr: string): IPv4;
    isValid(addr: string): boolean;
    isValidFourPartDecimal(addr: string): boolean;
  }
  interface IPv6Constructor {
    new (parts: number[]): IPv6;
    parse(addr: string): IPv6;
    isValid(addr: string): boolean;
  }

  const IPv4: IPv4Constructor;
  const IPv6: IPv6Constructor;

  function parse(addr: string): ParsedAddress;
  function parseCIDR(cidr: string): [ParsedAddress, number];
  function isValid(addr: string): boolean;
  function fromByteArray(bytes: number[]): ParsedAddress;

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ipaddr_ns {
    export { IPv4, IPv6, ParsedAddress, parse, parseCIDR, isValid, fromByteArray };
  }

  const ipaddr: {
    parse: typeof parse;
    parseCIDR: typeof parseCIDR;
    isValid: typeof isValid;
    fromByteArray: typeof fromByteArray;
    IPv4: IPv4Constructor;
    IPv6: IPv6Constructor;
  };
  export = ipaddr;
}
