"use client";

import React, { useState, useEffect } from "react";
import { useQuotationStore } from "@/context/QuotationStore";
import type { CreateQuotationData } from "@/types/quotation";
import HRSQuotationTemplate from "./HRSQuotationTemplate";

interface CreateQuotationFormProps {
  onSuccess?: (threadId: string) => void;
  onCancel?: () => void;
}

export default function CreateQuotationForm({ onSuccess, onCancel }: CreateQuotationFormProps) {
  const { templates, createQuotationWithTemplate, getNextRefID } = useQuotationStore();
  const [formData, setFormData] = useState<CreateQuotationData>({
    userRefID: "",
    hrsContent: {
      refID: "",
      partyName: "",
      partyAddress: "",
      date: new Date().toISOString(),
      vesselName: "",
      items: [{ slNo: "H01", description: "", qty: 1, unitPrice: 0, amount: 0 }],
      totalAmountInWords: "",
      note: "Quotation validity is only one week.",
      deliveryTerms: "07 Working Days from the Date of issue PO.",
      paymentTerms: "Payment must be made within 30 days of invoice submission.",
      mobileNumber: "",
      email: "",
    },
    additionalInfo: {},
  });

  // Auto-fill the next reference ID when component mounts
  useEffect(() => {
    const nextRefID = getNextRefID();
    setFormData(prev => ({
      ...prev,
      userRefID: nextRefID,
      hrsContent: {
        ...prev.hrsContent,
        refID: nextRefID,
      },
    }));
  }, [getNextRefID]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      hrsContent: field === 'userRefID' && prev.hrsContent ? { ...prev.hrsContent, refID: value } : prev.hrsContent,
    }));
  };

  const handleHRSChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      hrsContent: {
        ...prev.hrsContent!,
        [field]: value,
      },
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      hrsContent: {
        ...prev.hrsContent!,
        items: prev.hrsContent!.items.map((item, i) => {
          const updated = i === index ? { ...item, [field]: value } : item;
          const qty = field === 'qty' && i === index ? (parseFloat(value) || 0) : updated.qty;
          const unitPrice = field === 'unitPrice' && i === index ? (parseFloat(value) || 0) : updated.unitPrice;
          return { ...updated, amount: (qty * unitPrice) };
        }),
      },
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      hrsContent: {
        ...prev.hrsContent!,
        items: [...prev.hrsContent!.items, { slNo: `H${String(prev.hrsContent!.items.length + 1).padStart(2,'0')}`, description: "", qty: 1, unitPrice: 0, amount: 0 }],
      },
    }));
  };

  const removeItem = (index: number) => {
    if (formData.hrsContent!.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        hrsContent: {
          ...prev.hrsContent!,
          items: prev.hrsContent!.items.filter((_, i) => i !== index),
        },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userRefID.trim()) {
      alert("Please enter a reference ID");
      return;
    }

    // Sync ref in content and ensure amounts in words auto-filled
    if (formData.hrsContent) {
      formData.hrsContent.refID = formData.userRefID;
      const total = formData.hrsContent.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
      const inWords = total > 0 ? numberToWords(total) : formData.hrsContent.totalAmountInWords;
      formData.hrsContent.totalAmountInWords = inWords;
    }

    setIsSubmitting(true);
    try {
      const { thread } = createQuotationWithTemplate(formData);
      onSuccess?.(thread.threadId);
    } catch (error) {
      console.error("Error creating quotation:", error);
      alert("Error creating quotation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = undefined;

  function numberToWords(amount: number) {
    try {
      const whole = Math.floor(amount);
      // very lightweight words (EN)
      const formatter = new Intl.NumberFormat('en-US');
      return `${formatter.format(whole)} QATAR RIYALS ONLY.`;
    } catch {
      return `${amount.toFixed(2)} QATAR RIYALS ONLY.`;
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create New Quotation</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Provide party details, items, and terms. Live preview updates in real time.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference ID *
            </label>
            <input
              type="text"
              value={formData.userRefID}
              onChange={(e) => handleInputChange("userRefID", e.target.value)}
              placeholder="e.g., QT-2025-001"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated but editable. Shown on the document as Ref. ID. Thread ID will be: <span className="font-medium text-gray-700 dark:text-gray-200">{formData.userRefID || '—'}</span>
            </p>
          </div>

          {/* Template selection removed - single template in use */}
        </div>

        {/* Party & Quotation Details */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quotation Details</h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">Required</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Party Name *</label>
              <input type="text" value={formData.hrsContent!.partyName} onChange={(e)=>handleHRSChange('partyName', e.target.value)} placeholder="Company or client name" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Party Address *</label>
              <input type="text" value={formData.hrsContent!.partyAddress} onChange={(e)=>handleHRSChange('partyAddress', e.target.value)} placeholder="Full mailing address" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vessel Name *</label>
              <input type="text" value={formData.hrsContent!.vesselName} onChange={(e)=>handleHRSChange('vesselName', e.target.value)} placeholder="e.g., HALUL-45" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
              <input type="date" value={new Date(formData.hrsContent!.date).toISOString().slice(0,10)} onChange={(e)=>handleHRSChange('date', new Date(e.target.value).toISOString())} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Item Table</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <span className="text-base leading-none">＋</span>
              <span className="text-sm font-medium">Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.hrsContent!.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-white/5">
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SL No.</label>
                  <input type="text" value={item.slNo} onChange={(e)=>handleItemChange(index, 'slNo', e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <input type="text" value={item.description} onChange={(e)=>handleItemChange(index, 'description', e.target.value)} placeholder="Item details" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qty</label>
                  <input type="number" min="0" value={item.qty} onChange={(e)=>handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit Price</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e)=>handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full pr-10 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">QAR</span>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-1">
                  <div className="text-sm text-gray-500">Amount</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{item.amount.toFixed(2)}</div>
                </div>
                <div className="col-span-12 md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={formData.hrsContent!.items.length === 1}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

        {/* Total */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                {formData.hrsContent!.items.reduce((sum, it) => sum + it.amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-xs md:text-sm text-gray-700 dark:text-gray-200">
              In Words: {numberToWords(formData.hrsContent!.items.reduce((sum, it) => sum + it.amount, 0))}
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Terms & Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
              <textarea value={formData.hrsContent!.note} onChange={(e)=>handleHRSChange('note', e.target.value)} placeholder="Additional information for the client" className="w-full min-h-[80px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Terms</label>
              <textarea value={formData.hrsContent!.deliveryTerms} onChange={(e)=>handleHRSChange('deliveryTerms', e.target.value)} placeholder="Delivery time, location, and conditions" className="w-full min-h-[80px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
              <textarea value={formData.hrsContent!.paymentTerms} onChange={(e)=>handleHRSChange('paymentTerms', e.target.value)} placeholder="When and how payments should be made" className="w-full min-h-[80px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mobile Number</label>
                <input type="text" value={formData.hrsContent!.mobileNumber} onChange={(e)=>handleHRSChange('mobileNumber', e.target.value)} placeholder="e.g., +974 5555 5555" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input type="email" value={formData.hrsContent!.email} onChange={(e)=>handleHRSChange('email', e.target.value)} placeholder="client@example.com" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Amount In Words</label>
              <input type="text" value={formData.hrsContent!.totalAmountInWords} onChange={(e)=>handleHRSChange('totalAmountInWords', e.target.value)} placeholder="e.g., TEN-THOUSAND AND SIX HUNDRED QATAR RIYALS ONLY." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Live Preview</h3>
          <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white">
            {formData.hrsContent && (
              <div className="scale-[0.8] origin-top-left w-[990px]">
                {/* @ts-expect-error runtime visual only */}
                <HRSQuotationTemplate content={{ ...formData.hrsContent, items: formData.hrsContent.items.map(it=>({ ...it, amount: it.qty*it.unitPrice })) }} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg shadow-sm hover:from-brand-500 hover:to-brand-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Quotation"}
          </button>
        </div>
      </form>
    </div>
  );
}
