import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { FiPlus } from "react-icons/fi";
import productsService from "../services/productsService";
import categoriesService from "../services/categoriesService";
import unitsService from "../services/unitsService";
import Categories from "./Categories";
import Units from "./Units";
import productTaxesService from "../services/productTaxesService";
import productBarcodesService from "../services/productBarcodesService";
import useCrud from "../hooks/useCrud";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import Loader from "../components/Loader";

const asList = (data) =>
  Array.isArray(data) ? data : data?.content || data?.data || [];
const PAGE_SIZE = 8;
const barcodeRegex = /^[0-9A-Za-z-]{4,32}$/;

const schema = yup.object({
  categoryId: yup
    .number()
    .typeError("Category is required")
    .required("Category is required"),
  productName: yup.string().required("Product name is required"),
  sku: yup.string().required("SKU is required"),
  barcode: yup
    .string()
    .matches(barcodeRegex, "Enter a valid barcode")
    .required("Barcode is required"),
  purchasePrice: yup
    .number()
    .typeError("Enter a valid amount")
    .positive("Must be positive")
    .required("Required"),
  sellingPrice: yup
    .number()
    .typeError("Enter a valid amount")
    .positive("Must be positive")
    .required("Required"),
  stockQuantity: yup
    .number()
    .typeError("Enter a valid quantity")
    .min(0, "Cannot be negative")
    .required("Required"),
  minimumStock: yup
    .number()
    .typeError("Enter a valid quantity")
    .min(0, "Cannot be negative")
    .required("Required"),
  unit: yup.string().required("Unit is required"),
  status: yup.string().required("Status is required"),
  // extras — optional
  taxName: yup.string().nullable(),
  taxPercentage: yup
    .number()
    .typeError("Enter a valid percentage")
    .min(0)
    .max(100)
    .nullable()
    .transform((v, o) => (o === "" || o == null ? null : v)),
  altBarcode: yup
    .string()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .test(
      "fmt",
      "Enter a valid barcode",
      (v) => v == null || barcodeRegex.test(v),
    ),
});

const emptyValues = {
  categoryId: "",
  productName: "",
  sku: "",
  barcode: "",
  purchasePrice: "",
  sellingPrice: "",
  stockQuantity: "",
  minimumStock: "",
  unit: "PCS",
  status: "ACTIVE",
  taxName: "GST",
  taxPercentage: "",
  altBarcode: "",
};

export default function Products() {
  const { items, isLoading, isSaving, create, update, remove } = useCrud(
    productsService,
    {
      entityName: "Product",
    },
  );

  const [categories, setCategories] = useState(null);
  const [units, setUnits] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues });

  // inline creation so Categories / Units need no separate screens
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ unitName: "", shortName: "" });
  const [savingRef, setSavingRef] = useState(false);
  const [manage, setManage] = useState(null); // 'category' | 'unit' | null

  const loadRefs = () =>
    Promise.all([
      categoriesService.getAll(),
      unitsService.getAll().catch(() => []),
      productTaxesService.getAll().catch(() => []),
    ]).then(([c, u, t]) => {
      setCategories(asList(c));
      setUnits(asList(u));
      setTaxes(asList(t));
    });

  useEffect(() => {
    loadRefs();
  }, []);

  const unitOptions = useMemo(() => {
    if (units.length) {
      return units.map((u) => ({
        value: u.shortName || u.unitName,
        label: u.unitName,
      }));
    }
    return [
      { value: "PCS", label: "Pieces" },
      { value: "KG", label: "Kilogram" },
      { value: "L", label: "Litre" },
      { value: "BOX", label: "Box" },
      { value: "PACKET", label: "Packet" },
      { value: "BOTTLE", label: "Bottle" },
    ];
  }, [units]);

  const taxFor = (productId) =>
    taxes.find((t) => (t.productId ?? t.id) === productId);
  const catName = (id) =>
    categories?.find((c) => c.id === id)?.categoryName || id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      ["productName", "sku", "barcode"].some((k) =>
        String(p[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditingRow(null);
    reset(emptyValues);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    const tax = taxFor(row.id ?? row.productId);
    reset({
      ...emptyValues,
      ...row,
      taxName: tax?.taxName || "GST",
      taxPercentage: tax?.taxPercentage ?? "",
      altBarcode: "",
    });
    setShowForm(true);
  };

  const onSubmit = async (values) => {
    const productPayload = {
      categoryId: Number(values.categoryId),
      productName: values.productName,
      sku: values.sku,
      barcode: values.barcode,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      stockQuantity: Number(values.stockQuantity),
      minimumStock: Number(values.minimumStock),
      unit: values.unit,
      status: values.status,
    };

    let saved;
    if (editingRow) {
      saved = await update(
        editingRow.id ?? editingRow.productId,
        productPayload,
      );
    } else {
      saved = await create(productPayload);
    }
    const productId =
      saved?.id ?? saved?.productId ?? editingRow?.id ?? editingRow?.productId;

    // --- GST / tax (product_taxes) ---
    if (
      productId &&
      values.taxPercentage != null &&
      values.taxPercentage !== ""
    ) {
      const existing = taxFor(productId);
      const taxPayload = {
        productId: Number(productId),
        taxName: values.taxName || "GST",
        taxPercentage: Number(values.taxPercentage),
      };
      try {
        if (existing) {
          await productTaxesService.update(
            existing.id ?? existing.taxId,
            taxPayload,
          );
        } else {
          await productTaxesService.create(taxPayload);
        }
      } catch {
        toast.error("Product saved, but the tax could not be stored.");
      }
    }

    // --- optional additional barcode (product_barcodes) ---
    if (productId && values.altBarcode) {
      try {
        await productBarcodesService.create({
          productId: Number(productId),
          barcode: values.altBarcode,
        });
      } catch {
        toast.error(
          "Product saved, but the extra barcode could not be stored.",
        );
      }
    }

    await loadRefs();
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id ?? deletingRow.productId);
    setDeletingRow(null);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return toast.error("Enter a category name");
    setSavingRef(true);
    try {
      const c = await categoriesService.create({
        categoryName: newCategoryName.trim(),
        status: "ACTIVE",
      });
      await loadRefs();
      const id = c?.id ?? c?.categoryId;
      if (id != null) setValue("categoryId", id, { shouldValidate: true });
      toast.success("Category added");
      setShowNewCategory(false);
      setNewCategoryName("");
    } catch {
      /* interceptor toasts */
    } finally {
      setSavingRef(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.unitName.trim() || !newUnit.shortName.trim())
      return toast.error("Enter unit name and short name");
    setSavingRef(true);
    try {
      await unitsService.create({
        unitName: newUnit.unitName.trim(),
        shortName: newUnit.shortName.trim(),
      });
      await loadRefs();
      setValue("unit", newUnit.shortName.trim(), { shouldValidate: true });
      toast.success("Unit added");
      setShowNewUnit(false);
      setNewUnit({ unitName: "", shortName: "" });
    } catch {
      /* interceptor toasts */
    } finally {
      setSavingRef(false);
    }
  };

  if (!categories) return <Loader label="Loading catalog..." />;

  return (
    <div>
      <div className="erp-page-header">
        <div />
        <div className="d-flex align-items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products..."
          />
          <button
            className="btn btn-primary d-flex align-items-center gap-1"
            onClick={openCreate}
          >
            <FiPlus /> Add Product
          </button>
        </div>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={pageRows}
        keyField="productId"
        onEdit={openEdit}
        onDelete={setDeletingRow}
        emptyTitle="No products yet"
        emptyMessage='Click "Add Product" to create your first product.'
        columns={[
          { key: "productId", label: "ID", sortable: true },
          { key: "productName", label: "Product", sortable: true },
          { key: "sku", label: "SKU" },
          { key: "barcode", label: "Barcode" },
          {
            key: "categoryId",
            label: "Category",
            render: (r) => catName(r.categoryId),
          },
          {
            key: "gst",
            label: "GST %",
            render: (r) => {
              const t = taxFor(r.id ?? r.productId);
              return t ? `${t.taxPercentage}%` : "—";
            },
          },
          {
            key: "sellingPrice",
            label: "Selling",
            sortable: true,
            render: (r) => Number(r.sellingPrice ?? 0).toFixed(2),
          },
          {
            key: "stockQuantity",
            label: "Stock",
            sortable: true,
            render: (r) => (
              <span
                className={`badge ${
                  Number(r.stockQuantity) <= Number(r.minimumStock)
                    ? "bg-danger"
                    : "bg-success"
                }`}
              >
                {r.stockQuantity}
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span
                className={`badge ${
                  String(r.status).toUpperCase() === "ACTIVE"
                    ? "bg-success"
                    : "bg-secondary"
                }`}
              >
                {r.status}
              </span>
            ),
          },
        ]}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />

      <Modal
        show={showForm}
        size="modal-xl"
        title={editingRow ? "Edit Product" : "Add Product"}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Product"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row">
            <div className="col-md-6">
              <label className="form-label d-flex justify-content-between align-items-center">
                <span>
                  Category <span className="text-danger">*</span>
                </span>
                <span className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1"
                    onClick={() => setShowNewCategory(true)}
                  >
                    <FiPlus size={13} /> New
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-secondary"
                    onClick={() => setManage("category")}
                  >
                    Manage
                  </button>
                </span>
              </label>
              <FormSelect
                label=""
                name="categoryId"
                register={register}
                error={errors.categoryId}
                options={categories}
                valueKey="id"
                labelKey="categoryName"
              />
            </div>
            <div className="col-md-6">
              <FormInput
                label="Product Name"
                name="productName"
                register={register}
                error={errors.productName}
                required
              />
            </div>
            <div className="col-md-6">
              <FormInput
                label="SKU"
                name="sku"
                register={register}
                error={errors.sku}
                required
              />
            </div>
            <div className="col-md-6">
              <FormInput
                label="Barcode (primary)"
                name="barcode"
                register={register}
                error={errors.barcode}
                required
              />
            </div>
            <div className="col-md-3">
              <FormInput
                label="Purchase Price"
                name="purchasePrice"
                type="number"
                step="0.01"
                register={register}
                error={errors.purchasePrice}
                required
              />
            </div>
            <div className="col-md-3">
              <FormInput
                label="Selling Price"
                name="sellingPrice"
                type="number"
                step="0.01"
                register={register}
                error={errors.sellingPrice}
                required
              />
            </div>
            <div className="col-md-3">
              <FormInput
                label="Stock Quantity"
                name="stockQuantity"
                type="number"
                register={register}
                error={errors.stockQuantity}
                required
              />
            </div>
            <div className="col-md-3">
              <FormInput
                label="Minimum Stock"
                name="minimumStock"
                type="number"
                register={register}
                error={errors.minimumStock}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label d-flex justify-content-between align-items-center">
                <span>
                  Unit <span className="text-danger">*</span>
                </span>
                <span className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1"
                    onClick={() => setShowNewUnit(true)}
                  >
                    <FiPlus size={13} /> New
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-secondary"
                    onClick={() => setManage("unit")}
                  >
                    Manage
                  </button>
                </span>
              </label>
              <FormSelect
                label=""
                name="unit"
                register={register}
                error={errors.unit}
                options={unitOptions}
              />
            </div>
            <div className="col-md-6">
              <FormSelect
                label="Status"
                name="status"
                register={register}
                error={errors.status}
                required
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
              />
            </div>
          </div>

          <hr />
          <div
            className="text-muted small mb-2 fw-semibold text-uppercase"
            style={{ letterSpacing: "0.04em" }}
          >
            Tax &amp; extra barcode (optional)
          </div>
          <div className="row">
            <div className="col-md-4">
              <FormInput
                label="Tax Name"
                name="taxName"
                register={register}
                error={errors.taxName}
                placeholder="GST"
              />
            </div>
            <div className="col-md-4">
              <FormInput
                label="GST / Tax %"
                name="taxPercentage"
                type="number"
                step="0.01"
                register={register}
                error={errors.taxPercentage}
                placeholder="e.g. 5"
              />
            </div>
            <div className="col-md-4">
              <FormInput
                label="Additional Barcode"
                name="altBarcode"
                register={register}
                error={errors.altBarcode}
                placeholder="optional"
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        show={showNewCategory}
        title="Add Category"
        onClose={() => setShowNewCategory(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowNewCategory(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddCategory}
              disabled={savingRef}
            >
              {savingRef ? "Saving..." : "Save & Select"}
            </button>
          </>
        }
      >
        <label className="form-label">
          Category Name <span className="text-danger">*</span>
        </label>
        <input
          className="form-control"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          autoFocus
        />
      </Modal>

      <Modal
        show={showNewUnit}
        title="Add Unit"
        onClose={() => setShowNewUnit(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowNewUnit(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddUnit}
              disabled={savingRef}
            >
              {savingRef ? "Saving..." : "Save & Select"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">
            Unit Name <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newUnit.unitName}
            onChange={(e) =>
              setNewUnit((u) => ({ ...u, unitName: e.target.value }))
            }
            placeholder="e.g. Kilogram"
            autoFocus
          />
        </div>
        <div className="mb-3">
          <label className="form-label">
            Short Name <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newUnit.shortName}
            onChange={(e) =>
              setNewUnit((u) => ({ ...u, shortName: e.target.value }))
            }
            placeholder="e.g. kg"
          />
        </div>
      </Modal>

      <Modal
        show={Boolean(manage)}
        size="modal-lg"
        title={manage === "unit" ? "Manage Units" : "Manage Categories"}
        onClose={() => {
          setManage(null);
          loadRefs();
        }}
        footer={
          <button
            className="btn btn-secondary"
            onClick={() => {
              setManage(null);
              loadRefs();
            }}
          >
            Done
          </button>
        }
      >
        {manage === "unit" ? (
          <Units />
        ) : manage === "category" ? (
          <Categories />
        ) : null}
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete product?"
        message="This will remove the product (or mark it inactive if it has sales/purchase history)."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
