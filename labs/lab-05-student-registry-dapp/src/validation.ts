import { getAddress, isAddress } from "viem";

export function parseScore(value: string): number {
  if (!/^\d+$/u.test(value)) throw new Error("Score must be a whole number.");
  const score = Number(value);
  if (score < 0 || score > 100) throw new Error("Score must be from 0 to 100.");
  return score;
}

export function parseStudent(address: string, name: string, score: string) {
  if (!isAddress(address)) throw new Error("Enter a valid Ethereum address.");
  if (name.trim().length === 0) throw new Error("Student name is required.");
  return { address: getAddress(address), name: name.trim(), score: parseScore(score) };
}
