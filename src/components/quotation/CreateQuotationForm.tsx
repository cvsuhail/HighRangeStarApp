"use client";

import React, { useState, useEffect } from "react";
import { useQuotationStore } from "@/context/QuotationStore";
import type { CreateQuotationData } from "@/types/quotation";
import HRSQuotationTemplate from "./HRSQuotationTemplate";
import { VesselNameInput } from "@/components/form/vessel-name-input";

interface CreateQuotationFormProps {
  onSuccess?: (threadId: string) => void;
  onCancel?: () => void;
}

export default function CreateQuotationForm({ onSuccess, onCancel }: CreateQuotationFormProps) {
  const { createQuotationWithTemplate, getNextRefID } = useQuotationStore();
  const [baseRef, setBaseRef] = useState("");
  const [vesselCode, setVesselCode] = useState("");
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
    (async () => {
      const nextRefID = await getNextRefID();
      setBaseRef(nextRefID);
      setFormData(prev => ({
        ...prev,
        userRefID: nextRefID,
        hrsContent: {
          ...prev.hrsContent,
          refID: nextRefID,
        },
      }));
    })();
  }, [getNextRefID]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRefWithVessel = (ref: string, code: string) => {
    if (!code) return ref;
    // Remove any existing suffix and append the latest code
    const refBase = ref.replace(/-([A-Z]\d+)$/i, "");
    return `${refBase}-${code.toUpperCase()}`;
  };

  const handleInputChange = (field: keyof CreateQuotationData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      hrsContent: field === 'userRefID' && prev.hrsContent ? { ...prev.hrsContent, refID: String(value) } : prev.hrsContent,
    }));
  };

  const handleHRSChange = (field: keyof CreateQuotationData['hrsContent'], value: unknown) => {
    setFormData(prev => ({
      ...prev,
      hrsContent: {
        ...prev.hrsContent!,
        [field]: value,
      },
    }));
  };

  const handleItemChange = (index: number, field: 'slNo' | 'description' | 'qty' | 'unitPrice', value: unknown) => {
    setFormData(prev => ({
      ...prev,
      hrsContent: {
        ...prev.hrsContent!,
        items: prev.hrsContent!.items.map((item, i) => {
          const updated = i === index ? { ...item, [field]: value as never } : item;
          const qty = field === 'qty' && i === index ? (Number(value) || 0) : updated.qty;
          const unitPrice = field === 'unitPrice' && i === index ? (Number(value) || 0) : updated.unitPrice;
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
      const { thread } = await createQuotationWithTemplate(formData);
      onSuccess?.(thread.threadId);
    } catch (error) {
      console.error("Error creating quotation:", error);
      alert("Error creating quotation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single HRS template used; no selection needed

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
    <div className="max-w-5xl mx-auto p-8 bg-gradient-to-br from-white via-gray-50/30 to-white dark:from-gray-800 dark:via-gray-800/80 dark:to-gray-800 rounded-2xl shadow-theme-lg border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
              Create New Quotation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Provide party details, items, and terms. Live preview updates in real time.
            </p>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-brand-500"></div>
            <span>Basic Info</span>
          </div>
          <div className="w-8 h-px bg-gray-200 dark:bg-gray-600"></div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            <span>Items & Terms</span>
          </div>
          <div className="w-8 h-px bg-gray-200 dark:bg-gray-600"></div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            <span>Preview</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <span>Reference ID</span>
                <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.userRefID}
                  onChange={(e) => handleInputChange("userRefID", e.target.value)}
                  placeholder="e.g., QT-2025-001"
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Auto-generated but editable. Thread ID: <span className="font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{formData.userRefID || '—'}</span>
              </p>
            </div>

          {/* Template selection removed - single template in use */}
        </div>

        </div>

        {/* Party & Quotation Details */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quotation Details</h3>
            <span className="text-xs px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-medium">Required</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <span>Party Name</span>
                <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.hrsContent!.partyName} 
                  onChange={(e)=>handleHRSChange('partyName', e.target.value)} 
                  placeholder="Company or client name" 
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  required 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <span>Party Address</span>
                <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.hrsContent!.partyAddress} 
                  onChange={(e)=>handleHRSChange('partyAddress', e.target.value)} 
                  placeholder="Full mailing address" 
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  required 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <span>Vessel Name</span>
                <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <VesselNameInput
                  value={formData.hrsContent!.vesselName}
                  onChange={(value) => handleHRSChange('vesselName', value)}
                  onVesselParsed={(parsed) => {
                    setVesselCode(parsed.code || "");
                    // Update displayed ref to include parsed vessel code
                    setFormData(prev => {
                      const mergedRef = formatRefWithVessel(baseRef || prev.userRefID, parsed.code || "");
                      return {
                        ...prev,
                        userRefID: mergedRef,
                        hrsContent: {
                          ...prev.hrsContent!,
                          refID: mergedRef,
                        },
                      };
                    });
                  }}
                  onVesselSaved={(savedVessel) => {
                    // Optional: Handle vessel saved event
                    console.log('Vessel saved:', savedVessel);
                  }}
                  autoSave={true}
                  placeholder="e.g., HALUL-45"
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={new Date(formData.hrsContent!.date).toISOString().slice(0,10)} 
                  onChange={(e)=>handleHRSChange('date', new Date(e.target.value).toISOString())} 
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Item Table</h3>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 shadow-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {formData.hrsContent!.items.map((item, index) => (
              <div key={index} className="group grid grid-cols-12 gap-4 items-end p-5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-white via-gray-50/50 to-white dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-800/50 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200">
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">SL No.</label>
                  <input 
                    type="text" 
                    value={item.slNo} 
                    onChange={(e)=>handleItemChange(index, 'slNo', e.target.value)} 
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  />
                </div>
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Description</label>
                  <input 
                    type="text" 
                    value={item.description} 
                    onChange={(e)=>handleItemChange(index, 'description', e.target.value)} 
                    placeholder="Item details" 
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Qty</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={item.qty} 
                    onChange={(e)=>handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)} 
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Unit Price</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={item.unitPrice} 
                      onChange={(e)=>handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} 
                      className="w-full pr-12 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/20 px-2 py-0.5 rounded">QAR</span>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-1">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Amount</div>
                  <div className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="font-bold text-lg text-brand-600 dark:text-brand-400">{item.amount.toFixed(2)}</div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={formData.hrsContent!.items.length === 1}
                    className="w-full px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group-hover:opacity-100 opacity-70"
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 p-6 bg-gradient-to-r from-brand-50 via-brand-50/50 to-brand-50 dark:from-brand-500/10 dark:via-brand-500/5 dark:to-brand-500/10 rounded-xl border border-brand-200 dark:border-brand-500/20">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Total Amount</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                  {formData.hrsContent!.items.reduce((sum, it) => sum + it.amount, 0).toFixed(2)} QAR
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {formData.hrsContent!.items.reduce((sum, it) => sum + it.amount, 0).toLocaleString()} Qatari Riyals
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount in Words:</div>
              <div className="text-sm text-gray-800 dark:text-gray-200 italic">
                {numberToWords(formData.hrsContent!.items.reduce((sum, it) => sum + it.amount, 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terms & Notes</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Note</label>
              <div className="relative">
                <textarea 
                  value={formData.hrsContent!.note} 
                  onChange={(e)=>handleHRSChange('note', e.target.value)} 
                  placeholder="Additional information for the client" 
                  className="w-full min-h-[100px] px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 resize-none" 
                />
                <div className="absolute top-3 left-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Delivery Terms</label>
              <div className="relative">
                <textarea 
                  value={formData.hrsContent!.deliveryTerms} 
                  onChange={(e)=>handleHRSChange('deliveryTerms', e.target.value)} 
                  placeholder="Delivery time, location, and conditions" 
                  className="w-full min-h-[100px] px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 resize-none" 
                />
                <div className="absolute top-3 left-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment Terms</label>
              <div className="relative">
                <textarea 
                  value={formData.hrsContent!.paymentTerms} 
                  onChange={(e)=>handleHRSChange('paymentTerms', e.target.value)} 
                  placeholder="When and how payments should be made" 
                  className="w-full min-h-[100px] px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 resize-none" 
                />
                <div className="absolute top-3 left-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Mobile Number</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.hrsContent!.mobileNumber} 
                    onChange={(e)=>handleHRSChange('mobileNumber', e.target.value)} 
                    placeholder="e.g., +974 5555 5555" 
                    className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Email</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={formData.hrsContent!.email} 
                    onChange={(e)=>handleHRSChange('email', e.target.value)} 
                    placeholder="client@example.com" 
                    className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Total Amount In Words</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.hrsContent!.totalAmountInWords} 
                  onChange={(e)=>handleHRSChange('totalAmountInWords', e.target.value)} 
                  placeholder="e.g., TEN-THOUSAND AND SIX HUNDRED QATAR RIYALS ONLY." 
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
          </div>
          
          <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white shadow-inner">
            {formData.hrsContent && (
              <div className="scale-[0.75] origin-top-left w-[990px] p-4">
                {/* @ts-expect-error runtime visual only */}
                <HRSQuotationTemplate content={{ ...formData.hrsContent, items: formData.hrsContent.items.map(it=>({ ...it, amount: it.qty*it.unitPrice })) }} />
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This preview updates automatically as you fill in the form. The final quotation will match this preview.</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center gap-2 h-12 px-6 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl shadow-lg hover:from-brand-600 hover:to-brand-700 hover:shadow-xl active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Creating Quotation...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Quotation
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>All required fields are marked with an asterisk (*)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mt-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Changes are automatically saved as you type</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
