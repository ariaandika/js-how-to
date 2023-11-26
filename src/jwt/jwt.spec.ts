import { Jwt } from "./jwt"
import { describe, test, expect } from "bun:test";

const data = { id: 1, name: 'test' };
const secret = 'secret';

describe('Jwt implementation', () => {
  test('sign and verify jwt', () => {
    const jwt = new Jwt<{ id: number, name: string }>(secret)
    const jwtString = jwt.sign(data);

    expect(jwtString).toBeString();

    const { payload } = jwt.verify(jwtString as string) as Exclude<ReturnType<typeof jwt.verify>,Error>

    expect(payload).toMatchObject(data as any);
  })
});




