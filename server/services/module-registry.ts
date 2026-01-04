import { db } from "../db";
import { moduleRegistry, ModuleRegistry, InsertModuleRegistry } from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export class ModuleRegistryService {
  async list(): Promise<ModuleRegistry[]> {
    return db.select()
      .from(moduleRegistry)
      .orderBy(asc(moduleRegistry.displayOrder), asc(moduleRegistry.name));
  }

  async listEnabled(): Promise<ModuleRegistry[]> {
    return db.select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.enabled, true))
      .orderBy(asc(moduleRegistry.displayOrder), asc(moduleRegistry.name));
  }

  async listByCategory(category: "core" | "optional"): Promise<ModuleRegistry[]> {
    return db.select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.category, category))
      .orderBy(asc(moduleRegistry.displayOrder), asc(moduleRegistry.name));
  }

  async getById(id: string): Promise<ModuleRegistry | null> {
    const [result] = await db.select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, id));
    return result || null;
  }

  async getByCode(code: string): Promise<ModuleRegistry | null> {
    const [result] = await db.select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.code, code));
    return result || null;
  }

  async create(data: Omit<InsertModuleRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModuleRegistry> {
    const [result] = await db.insert(moduleRegistry)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async update(id: string, data: Partial<Omit<InsertModuleRegistry, 'id' | 'code' | 'createdAt' | 'updatedAt'>>): Promise<ModuleRegistry | null> {
    const [result] = await db.update(moduleRegistry)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(moduleRegistry.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(moduleRegistry)
      .where(eq(moduleRegistry.id, id))
      .returning();
    return result.length > 0;
  }

  async setEnabled(id: string, enabled: boolean): Promise<ModuleRegistry | null> {
    return this.update(id, { enabled });
  }
}

export const moduleRegistryService = new ModuleRegistryService();
