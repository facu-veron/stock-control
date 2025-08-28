// routes/customers.ts
import { Router } from "express";
import { prisma } from "../lib/prisma"; 

import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

// Listar clientes (opcional: filtros simples y paginación)
router.get("/", authenticateToken, async (req, res): Promise<void> => {
  try {
    const tenantId = (req as any).user.tenantId;
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: customers });
    return;
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
    return;
  }
});

router.get("/:id", authenticateToken, async (req, res): Promise<void> => {
  const { id } = req.params;
  const tenantId = (req as any).user.tenantId;
  try {
    const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) {
      res.status(404).json({ success: false, error: "Customer not found" });
      return;
    }
    res.json({ success: true, data: customer });
    return;
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch customer" });
    return;
  }
});

router.post("/", authenticateToken, requireRole(["ADMIN"]),
  async (req, res): Promise<void> => {
    const tenantId = (req as any).user.tenantId;
    try {
      const created = await prisma.customer.create({ data: { ...req.body, tenantId, taxId: req.body.taxId } });
      res.status(201).json({ success: true, data: created });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to create customer" });
      return;
    }
  }
);

router.put("/:id", authenticateToken, requireRole(["ADMIN"]),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user.tenantId;
    try {
      const updated = await prisma.customer.updateMany({ where: { id, tenantId }, data: { ...req.body, taxId: req.body.taxId } });
      if (updated.count === 0) {
        res.status(404).json({ success: false, error: "Customer not found" });
        return;
      }
      const fresh = await prisma.customer.findFirst({ where: { id, tenantId } });
      res.json({ success: true, data: fresh });
      return;
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update customer" });
      return;
    }
  }
);

router.delete("/:id", authenticateToken, requireRole(["ADMIN"]),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user.tenantId;
    try {
      const deleted = await prisma.customer.deleteMany({ where: { id, tenantId } });
      if (deleted.count === 0) {
        res.status(404).json({ success: false, error: "Customer not found" });
        return;
      }
      res.json({ success: true, message: "Customer deleted successfully" });
      return;
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete customer" });
      return;
    }
  }
);


export default router;
