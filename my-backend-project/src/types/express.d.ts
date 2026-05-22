declare namespace Express {
  export interface Request {
    user?: {
      manv: string;
      hoten: string;
      tendn: string;
      iat: number;
      exp: number;
    };
  }
}
