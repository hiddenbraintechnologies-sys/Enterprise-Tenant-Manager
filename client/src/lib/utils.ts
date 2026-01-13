import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLimit(limit: number): string {
  if (limit === -1) return "Unlimited";
  if (limit === 0) return "Not available";
  return limit.toString();
}

export function formatStorageLimit(storageMb: number): string {
  if (storageMb === -1) return "Unlimited";
  if (storageMb === 0) return "Not available";
  if (storageMb >= 1024) {
    const gb = storageMb / 1024;
    return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${storageMb} MB`;
}
