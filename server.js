require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./modules/db");
const Driver = require("./modules/Driver");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function normalizeDepartments(departments) {
  if (Array.isArray(departments)) return departments.filter(Boolean).map((d) => String(d).trim()).filter(Boolean);
  if (typeof departments === "string" && departments.trim()) return [departments.trim()];
  return [];
}

function parseStartDate(body) {
  const year = Number(body.startYear || 0);
  const month = Number(body.startMonth || 0);
  const day = Number(body.startDay || 0);

  if (year > 0 && month > 0 && day > 0) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return String(body.startDate || "").trim();
}

function parseAndValidateDriver(body) {
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const vehicleNumber = String(body.vehicleNumber || "").trim();
  const licenseNumber = String(body.licenseNumber || "").trim();
  const manualDepartment = String(body.department || "").trim();
  const departments = normalizeDepartments(body.departments);
  const salary = Number(body.salary ?? body.basicSalary);
  const paymentStatus = String(body.paymentStatus || "Pending").trim();

  if (!name) {
    return { error: "Driver ka naam zaroori hai." };
  }

  if (!Number.isFinite(salary) || salary < 0) {
    return { error: "Salary ek valid number honi chahiye." };
  }

  const resolvedDepartments = departments.length ? departments : (manualDepartment ? [manualDepartment] : []);

  return {
    value: {
      name,
      phone,
      vehicleNumber,
      licenseNumber,
      department: manualDepartment || resolvedDepartments.join(", "),
      departments: resolvedDepartments,
      salary,
      paymentStatus,
      gender: String(body.gender || "").trim(),
      profileImage: String(body.profileImage || "").trim(),
      startDate: parseStartDate(body),
      notes: String(body.notes || "").trim(),
    },
  };
}

app.get("/debug", async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers.map(d => ({ 
    _id: d._id, 
    id: d.id, 
    name: d.name, 
    salary: d.salary, 
    paymentStatus: d.paymentStatus 
  })));
});

app.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.render("index", { drivers, formError: null, formData: null, editingId: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading drivers");
  }
});

app.get("/add", (req, res) => {
  res.render("add", { error: null, driver: { name: "", department: "", salary: "" } });
});

app.post("/add", async (req, res) => {
  console.log("Body:", req.body);
  const result = parseAndValidateDriver(req.body);
  console.log("Result:", result);

  if (result.error) {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    return res.status(400).render("index", {
      drivers,
      formError: result.error,
      formData: req.body,
      editingId: null,
    });
  }

  try {
    console.log("Creating driver with:", result.value);
    const newDriver = new Driver({
      ...result.value,
      paymentHistory: [],
      pendingMonths: 0,
      lastPaymentDate: null
    });
    console.log("About to save...");
    await newDriver.save();
    console.log("Saved successfully!");
    res.redirect("/");
  } catch (err) {
    console.error("Save error:", err);
    const drivers = await Driver.find().sort({ createdAt: -1 });
    return res.status(400).render("index", {
      drivers,
      formError: "Error saving driver: " + err.message,
      formData: req.body,
      editingId: null
    });
  }
});

app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const driver = await Driver.findOne({ _id: id });

    if (!driver) {
      return res.redirect("/");
    }

    res.render("edit", { error: null, driver });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

app.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const result = parseAndValidateDriver(req.body);

  if (result.error) {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    return res.status(400).render("index", {
      drivers,
      formError: result.error,
      formData: req.body,
      editingId: id,
    });
  }

  try {
    await Driver.findOneAndUpdate(
      { _id: id },
      { ...result.value, updatedAt: Date.now() },
      { new: true }
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating driver");
  }
});

app.get("/delete/:id", async (req, res) => {
  const id = req.params.id;
  console.log("Delete request for id:", id);
  try {
    const result = await Driver.findOneAndDelete({ _id: id });
    console.log("Delete result:", result);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting driver");
  }
});

app.post("/payment/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  
  console.log("Payment request:", { id, status, body: req.body });

  try {
    console.log("Looking for driver with id:", id);
    const driver = await Driver.findOne({ _id: id });
    console.log("Found driver:", driver ? driver.name : "NOT FOUND");
    if (!driver) {
      return res.redirect("/");
    }
    console.log("Current paymentStatus:", driver.paymentStatus);

    const now = new Date();

    if (status === "Paid") {
      const paymentEntry = {
        paymentDate: now,
        amount: driver.salary,
        notes: `Salary paid for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        createdAt: now
      };

      await Driver.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            paymentStatus: "Paid",
            lastPaymentDate: now,
            updatedAt: now,
            pendingMonths: 0
          },
          $push: { paymentHistory: paymentEntry }
        }
      );
    } else {
      await Driver.findOneAndUpdate(
        { _id: id },
        { paymentStatus: status, updatedAt: Date.now() }
      );
    }

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating payment status");
  }
});

app.get("/history/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const driver = await Driver.findOne({ _id: id });
    if (!driver) {
      return res.redirect("/");
    }
    res.render("history", { driver });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
})();