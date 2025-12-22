import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getStoredTests, loadTestOptions } from "../../services/testService";
import { Search } from "lucide-react";
import Select from "react-select/async";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registerAndBillPatient } from "@/services/crelioApi";
import { toast } from "@/components/ui/use-toast";
import { useICDCodeSearch } from "../../hooks/queries/billing/useICDCodeSearch";
import { useOrganizationCredit } from "../../hooks/queries/billing/useOrganizationCredit";

interface PatientData {
  id: string;
  name: string;
  age: string;
  contactNo: string;
  previousReportDate: string;
  gender: string;
  organization: string;
  referral: string;
  dateOfBirth: {
    day: string;
    month: string;
    year: string;
  };
}

interface BillPatientFormProps {
  onClose: () => void;
  patientData: PatientData;
}

interface TestRow {
  id: number;
  testId: string;
  testName: string;
  icdCode: string;
  icdDescription: string;
  price: number;
  concession: number;
}

interface TestOption {
  value: string;
  label: string;
  price: number;
  icdCode: string;
}

interface ICDCode {
  code: string;
  description: string;
}

interface Test {
  id: string;
  name: string;
  price: number;
  // Add other test properties as needed
}

export const BillPatientForm = ({
  onClose,
  patientData,
}: BillPatientFormProps) => {
  const { register, setValue, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [testRows, setTestRows] = useState<
    Array<{
      id: number;
      testId: string;
      testName: string;
      icdCode: string;
      icdDescription: string;
      price: number;
      concession: number;
    }>
  >([]);

  // Add new state variables for payment info
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [concessionAmount, setConcessionAmount] = useState<number>(0);
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [organizationCredit, setOrganizationCredit] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [sameForReports, setSameForReports] = useState(false);
  const [payments, setPayments] = useState<
    Array<{ type: string; amount: number }>
  >([]);
  const [errors, setErrors] = useState<{
    [key: string]: { [key: string]: string };
  }>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const { searchICDCodes } = useICDCodeSearch();
  const { data: orgCredit = 0 } = useOrganizationCredit(patientData.organization);

  // Add this constant for payment methods
  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "medical_aid", label: "Medical Aid" },
    { value: "swipe", label: "Swipe" },
    { value: "transfer", label: "Transfer" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    const total = testRows.reduce((sum, row) => sum + (row.price || 0), 0);
    const concession = testRows.reduce(
      (sum, row) => sum + (row.concession || 0),
      0
    );
    setTotalAmount(total);
    setConcessionAmount(concession);
    setPayableAmount(total - concession);
  }, [testRows]);

  const loadTests = async () => {
    try {
      setLoading(true);
      const fetchedTests = await getStoredTests();
      setTests(fetchedTests);
      setFilteredTests(fetchedTests);
    } catch (error) {
      console.error("Error loading tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (inputValue: string) => {
    return await loadTestOptions(inputValue);
  };

  const validateRow = (row: (typeof testRows)[0]) => {
    const rowErrors: { [key: string]: string } = {};

    if (!row.icdCode.trim()) {
      rowErrors.icdCode = "ICD Code is required";
    }

    return rowErrors;
  };

  const handleTestSelect =
    (rowId: number) => (selectedOption: TestOption | null) => {
      if (!selectedOption) return;

      const updatedRows = testRows.map((row) => {
        if (row.id === rowId) {
          const newRow = {
            ...row,
            testId: selectedOption.value,
            testName: selectedOption.label,
            price: selectedOption.price,
            icdCode: selectedOption.icdCode || "",
          };
          const rowErrors = validateRow(newRow);
          setErrors((prev) => ({
            ...prev,
            [rowId]: rowErrors,
          }));
          return newRow;
        }
        return row;
      });
      setTestRows(updatedRows);
    };

  const handleIcdCodeChange = (rowId: number, value: string) => {
    const updatedRows = testRows.map((row) => {
      if (row.id === rowId) {
        const newRow = { ...row, icdCode: value };
        const rowErrors = validateRow(newRow);
        setErrors((prev) => ({
          ...prev,
          [rowId]: rowErrors,
        }));
        return newRow;
      }
      return row;
    });
    setTestRows(updatedRows);
  };

  const handleSubmit = async () => {
    try {
      console.log("Submit button clicked");
      let hasErrors = false;
      const newErrors: { [key: string]: { [key: string]: string } } = {};

      // Validate required fields
      if (!testRows.length) {
        toast({
          title: "Validation Error",
          description: "Please add at least one test",
          variant: "destructive",
        });
        return;
      }

      // Validate ICD codes for each test
      testRows.forEach((row) => {
        if (!row.icdCode.trim()) {
          hasErrors = true;
          newErrors[row.id] = { icdCode: "ICD Code is required" };
        }
      });

      setErrors(newErrors);

      if (hasErrors) {
        console.log("Validation errors:", newErrors);
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Prepare request data
      const requestData = {
        patientInfo: {
          name: patientData.name,
          age: patientData.age,
          gender: patientData.gender,
          contact: patientData.contactNo,
          dateOfBirth: patientData.dateOfBirth,
          email: "",
          address: "",
        },
        testDetails: testRows.map((row) => ({
          testId: row.testId,
          testName: row.testName,
          icdCode: row.icdCode,
          price: row.price,
          concession: row.concession,
        })),
        paymentInfo: {
          totalAmount,
          concessionAmount,
          payableAmount,
          payments: [], // Initialize with empty array
        },
        organizationId: patientData.organization,
        referralId: patientData.referral,
        comments: comment,
      };

      // Only include payments if they exist
      if (payments.length > 0) {
        requestData.paymentInfo.payments = payments;
      }

      console.log("Sending request:", requestData);
      const response = await registerAndBillPatient(requestData);
      console.log("API Response:", response);

      toast({
        title: "Success",
        description: "Patient registered and billed successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to register and bill patient",
        variant: "destructive",
      });
    }
  };

  const addTestRow = () => {
    const newRow: TestRow = {
      id: testRows.length + 1,
      testId: "",
      testName: "",
      icdCode: "",
      icdDescription: "",
      price: 0,
      concession: 0,
    };
    setTestRows([...testRows, newRow]);
  };

  const removeTestRow = (id: number) => {
    if (testRows.length > 1) {
      setTestRows(testRows.filter((row) => row.id !== id));
    }
  };

  const currentTime = new Date().toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  useEffect(() => {
    setOrganizationCredit(orgCredit);
  }, [orgCredit]);

  const formatAmount = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) {
      return "0.00";
    }
    // Ensure amount is a number
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return "0.00";
    }
    return numAmount.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[95vw] h-[90vh] mx-auto relative shadow-lg border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="flex items-center text-primary-600 hover:text-primary-700">
              <svg
                className="h-5 w-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <div className="text-sm text-gray-500">
              Last Report: {patientData.previousReportDate}
            </div>
          </div>
        </div>

        {/* Patient Details Section */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {patientData.name}
              </h2>
              <div className="mt-1 text-sm text-gray-500">
                {patientData.gender} • {patientData.age}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                ID: {patientData.id}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Contact: {patientData.contactNo}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Organization: {patientData.organization}
              </div>
              <div className="text-sm text-gray-500">
                Referral: {patientData.referral}
              </div>
              <div>
                <label className="block text-sm text-secondary-600 mb-1">
                  Select Privilege Card
                </label>
                <select className="w-full p-2 border border-gray-200 rounded">
                  <option>Select...</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Left Panel */}

            {/* Center Panel */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Test Search Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="space-y-4">
                    {/* Test Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search and Select Test
                      </label>
                      <Select
                        cacheOptions
                        defaultOptions
                        loadOptions={loadTestOptions}
                        onChange={(option) => {
                          if (option) {
                            const newRow: TestRow = {
                              id: testRows.length + 1,
                              testId: option.value,
                              testName: option.label,
                              price: option.price,
                              icdCode: "",
                              icdDescription: "",
                              concession: 0,
                            };
                            setTestRows([...testRows, newRow]);
                          }
                        }}
                        placeholder="Type to search tests..."
                        className="w-full"
                        classNamePrefix="select"
                        isClearable
                        isSearchable
                        noOptionsMessage={() => "No tests found"}
                      />
                    </div>

                    {/* ICD Code Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select ICD Code *
                      </label>
                      <Select
                        cacheOptions
                        defaultOptions
                        loadOptions={searchICDCodes}
                        onChange={(option) => {
                          if (option && testRows.length > 0) {
                            // Apply the selected ICD code to the last added test
                            const lastRowIndex = testRows.length - 1;
                            const updatedRows = testRows.map((row, index) => {
                              if (index === lastRowIndex) {
                                return {
                                  ...row,
                                  icdCode: option.value,
                                  icdDescription: option.description,
                                };
                              }
                              return row;
                            });
                            setTestRows(updatedRows);
                          }
                        }}
                        placeholder="Search ICD Code"
                        className="w-full"
                        classNamePrefix="select"
                        noOptionsMessage={() => "No ICD codes found"}
                      />
                    </div>
                  </div>
                </div>

                {/* Tests Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            #
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            Test Name
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            ICD Code
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            Price
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            Concession
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-gray-600">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {testRows.map((row) => (
                          <tr key={row.id} className="border-t border-gray-200">
                            <td className="p-3">{row.id}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={row.testName}
                                readOnly
                                className="w-full p-2 border rounded bg-gray-50"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={`${row.icdCode}${
                                  row.icdDescription
                                    ? ` - ${row.icdDescription}`
                                    : ""
                                }`}
                                readOnly
                                className="w-full p-2 border rounded bg-gray-50"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.price}
                                onChange={(e) => {
                                  const updatedRows = testRows.map((r) =>
                                    r.id === row.id
                                      ? { ...r, price: Number(e.target.value) }
                                      : r
                                  );
                                  setTestRows(updatedRows);
                                }}
                                className="w-full p-2 border rounded"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={row.concession}
                                onChange={(e) => {
                                  const updatedRows = testRows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          concession: Number(e.target.value),
                                        }
                                      : r
                                  );
                                  setTestRows(updatedRows);
                                }}
                                className="w-full p-2 border rounded"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                {testRows.length > 1 && (
                                  <button
                                    onClick={() => removeTestRow(row.id)}
                                    className="text-red-500 hover:text-red-600 px-2 py-1 rounded">
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {testRows.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Order Number
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Additional Bill Category
                            </label>
                            <select className="w-full p-2 border rounded">
                              <option>Select...</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Consulting Doctor
                            </label>
                            <select className="w-full p-2 border rounded">
                              <option>Gilbert Tambla</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-medium mb-4">Payment Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Concession (In USD)
                            </label>
                            <input
                              type="number"
                              value={concessionAmount}
                              onChange={(e) =>
                                setConcessionAmount(Number(e.target.value))
                              }
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Additional Amount
                            </label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              defaultValue={0}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Test Amount:
                            </span>
                            <span className="font-medium">
                              USD {formatAmount(totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Organization Credit:
                            </span>
                            <span className="font-medium">
                              USD {formatAmount(organizationCredit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Organization Payable:
                            </span>
                            <span className="font-medium">
                              USD {formatAmount(payableAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm text-gray-600 mb-1">
                          Add Comment
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full p-2 border rounded h-24"
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sameForReports}
                              onChange={(e) =>
                                setSameForReports(e.target.checked)
                              }
                              className="rounded border-gray-300"
                            />
                            <label className="text-sm text-gray-600">
                              Same for Reports
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedPaymentMethod}
                            onChange={(e) =>
                              setSelectedPaymentMethod(e.target.value)
                            }
                            className="w-48 p-2 border border-gray-300 rounded">
                            <option value="">Select Payment Method</option>
                            {paymentMethods.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (selectedPaymentMethod && payableAmount > 0) {
                                setPayments([
                                  ...payments,
                                  {
                                    type:
                                      paymentMethods.find(
                                        (m) => m.value === selectedPaymentMethod
                                      )?.label || selectedPaymentMethod,
                                    amount: payableAmount,
                                  },
                                ]);
                                setSelectedPaymentMethod("");
                              }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={
                              !selectedPaymentMethod || payableAmount <= 0
                            }>
                            Add Payment
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Payments:</span>
                          <button className="text-blue-500">Add Payment</button>
                        </div>
                        {payments.map((payment, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center mt-2">
                            <span>{payment.type}</span>
                            <span>USD {formatAmount(payment.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center mt-2 font-medium">
                          <span>Remaining</span>
                          <span>
                            USD{" "}
                            {formatAmount(
                              payableAmount -
                                payments.reduce((sum, p) => sum + p.amount, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div className="w-1/4 border-l border-gray-200 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Price List Details</h3>
                  <div>
                    <label className="block text-sm text-secondary-600 mb-1">
                      Referral Price List
                    </label>
                    <select className="w-full p-2 border border-gray-200 rounded">
                      <option>Search & Select List</option>
                    </select>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm text-secondary-600 mb-1">
                      Discounted Price List
                    </label>
                    <select className="w-full p-2 border border-gray-200 rounded">
                      <option>Search & Select List</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sameForReports}
              onChange={(e) => setSameForReports(e.target.checked)}
              className="rounded border-gray-300 text-primary-500"
            />
            <label className="text-sm text-secondary-600">
              Emergency Reports
            </label>
          </div>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 flex flex-col items-center">
            <span>Confirm and Bill</span>
            <span className="text-xs text-white/80">cmd + enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
