import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SupplierDTO, ApiResponse, CreateSupplierRequest } from '@campus-errand/common-dtos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/supplier_db';

app.use(cors());
app.use(express.json());

// Seed Suppliers & Campus Locations (M3)
const mockSuppliers: SupplierDTO[] = [
  {
    id: 's1111111-1111-1111-1111-111111111111',
    supplierCode: 'SUP-001',
    name: 'CoffeeBean @ COM3',
    campusZone: 'COM3',
    exactLocation: 'COM3 Level 1 Lobby',
    category: 'Beverages',
    description: 'Specialty coffee, pastries, and sandwiches',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2222222-2222-2222-2222-222222222222',
    supplierCode: 'SUP-002',
    name: 'Printers @ PCCommons',
    campusZone: 'UTown',
    exactLocation: 'Stephen Riady Centre Level 1',
    category: 'Printing',
    description: 'NUS fast printing & lecture note pickup hub',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3333333-3333-3333-3333-333333333333',
    supplierCode: 'SUP-003',
    name: 'PGP Mailroom & Smart Lockers',
    campusZone: 'PGPR',
    exactLocation: 'Prince George\'s Park Residences Foyer',
    category: 'Parcels',
    description: 'Courier parcel lockers and delivery collection point',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's4444444-4444-4444-4444-444444444444',
    supplierCode: 'SUP-004',
    name: 'Fine Food Canteen (UTown)',
    campusZone: 'UTown',
    exactLocation: 'Town Plaza Level 1',
    category: 'Food',
    description: 'Mala Xiang Guo, Chicken Rice, and Drinks',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's5555555-5555-5555-5555-555555555555',
    supplierCode: 'SUP-005',
    name: 'The Deck @ FASS',
    campusZone: 'FASS',
    exactLocation: 'Faculty of Arts & Social Sciences Level 2',
    category: 'Food',
    description: 'Yong Tau Foo and Japanese Bento',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'supplier-service', status: 'UP', port: PORT, timestamp: new Date() });
});

// List suppliers with zone and category filters
app.get('/api/suppliers', (req: Request, res: Response<ApiResponse<SupplierDTO[]>>) => {
  const { campusZone, category } = req.query;
  let results = [...mockSuppliers];

  if (campusZone) {
    results = results.filter((s) => s.campusZone.toLowerCase() === (campusZone as string).toLowerCase());
  }

  if (category) {
    results = results.filter((s) => s.category.toLowerCase() === (category as string).toLowerCase());
  }

  res.json({ success: true, data: results });
});

// Get specific supplier
app.get('/api/suppliers/:id', (req: Request, res: Response<ApiResponse<SupplierDTO>>) => {
  const supplier = mockSuppliers.find((s) => s.id === req.params.id);
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'Supplier not found' });
  }
  res.json({ success: true, data: supplier });
});

// Admin CRUD: Create new supplier
app.post('/api/suppliers', (req: Request, res: Response<ApiResponse<SupplierDTO>>) => {
  const body: CreateSupplierRequest = req.body;
  if (!body.name || !body.campusZone || !body.exactLocation) {
    return res.status(400).json({ success: false, error: 'Missing required supplier fields' });
  }

  const newSupplier: SupplierDTO = {
    id: `s-${Date.now()}`,
    supplierCode: body.supplierCode || `SUP-${mockSuppliers.length + 1}`,
    name: body.name,
    campusZone: body.campusZone,
    exactLocation: body.exactLocation,
    category: body.category || 'General',
    description: body.description,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  mockSuppliers.push(newSupplier);
  res.status(201).json({ success: true, data: newSupplier });
});

app.listen(PORT, () => {
  console.log(`🚀 [Supplier Service] running on port ${PORT} with tsx`);
});
