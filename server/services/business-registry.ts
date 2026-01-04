import { db } from "../db";
import { businessTypeRegistry, BusinessTypeRegistry, InsertBusinessTypeRegistry } from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export class BusinessRegistryService {
  async list(): Promise<BusinessTypeRegistry[]> {
    return db.select()
      .from(businessTypeRegistry)
      .orderBy(asc(businessTypeRegistry.displayOrder), asc(businessTypeRegistry.name));
  }

  async listEnabled(): Promise<BusinessTypeRegistry[]> {
    return db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.enabled, true))
      .orderBy(asc(businessTypeRegistry.displayOrder), asc(businessTypeRegistry.name));
  }

  async getById(id: string): Promise<BusinessTypeRegistry | null> {
    const [result] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, id));
    return result || null;
  }

  async getByCode(code: string): Promise<BusinessTypeRegistry | null> {
    const [result] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.code, code));
    return result || null;
  }

  async create(data: Omit<InsertBusinessTypeRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessTypeRegistry> {
    const [result] = await db.insert(businessTypeRegistry)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async update(id: string, data: Partial<Omit<InsertBusinessTypeRegistry, 'id' | 'code' | 'createdAt' | 'updatedAt'>>): Promise<BusinessTypeRegistry | null> {
    const [result] = await db.update(businessTypeRegistry)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(businessTypeRegistry.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, id))
      .returning();
    return result.length > 0;
  }

  async setEnabled(id: string, enabled: boolean): Promise<BusinessTypeRegistry | null> {
    return this.update(id, { enabled });
  }
}

export const businessRegistryService = new BusinessRegistryService();
