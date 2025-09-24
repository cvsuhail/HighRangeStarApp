"use client";

import Image from "next/image";
import React from "react";
import type { HRSQuotationContent } from "@/types/quotation";

type Props = {
  content: HRSQuotationContent;
};

export default function HRSQuotationTemplate({ content }: Props) {
  const total = content.items.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="bg-white text-gray-900 w-[794px] mx-auto shadow print:shadow-none">
      <div className="relative h-40">
        <Image src="/assets/QuotationHeader.png" alt="Header" fill priority className="object-contain" />
      </div>

      <div className="px-8 pt-4 pb-8">
        <h3 className="text-center font-bold tracking-wide mt-2 mb-4">QUOTATION</h3>
        <div className="flex items-start justify-between text-sm">
          <div className="space-y-1">
            <div><span className="font-semibold">Party Name:</span> {content.partyName}</div>
            <div><span className="font-semibold">Address:</span> {content.partyAddress}</div>
          </div>
          <div className="text-right space-y-1">
            <div><span className="font-semibold">Date:</span> {new Date(content.date).toLocaleDateString()}</div>
            <div><span className="font-semibold">Ref:</span> {content.refID}</div>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6">
          We thankfully acknowledge receipt of your inquiry to quote the prices for the Fabrication and
          Installation of the following items, in favour of your perusal evaluation, and approval.
        </p>

        <h3 className="text-center font-bold tracking-wide mt-4">{content.vesselName}</h3>

        <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-100 text-xs font-semibold">
            <div className="col-span-2 p-2 border-r">SL No.</div>
            <div className="col-span-6 p-2 border-r">Description</div>
            <div className="col-span-1 p-2 border-r text-right">Qty</div>
            <div className="col-span-1 p-2 border-r text-right">Unit price</div>
            <div className="col-span-2 p-2 text-right">Amount</div>
          </div>
          {content.items.map((row, idx) => (
            <div key={idx} className={`grid grid-cols-12 text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="col-span-2 p-2 border-t border-r border-gray-300">{row.slNo}</div>
              <div className="col-span-6 p-2 border-t border-r border-gray-300" dangerouslySetInnerHTML={{ __html: row.description }}></div>
              <div className="col-span-1 p-2 border-t border-r border-gray-300 text-right">{row.qty.toString().padStart(2, '0')}</div>
              <div className="col-span-1 p-2 border-t border-r border-gray-300 text-right">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="col-span-2 p-2 border-t border-gray-300 text-right">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
          <div className="grid grid-cols-12 bg-gray-100 text-xs font-semibold border-t border-gray-300">
            <div className="col-span-10 p-2 text-right">TOTAL</div>
            <div className="col-span-2 p-2 text-right">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-xs font-semibold p-2 border-t border-gray-300">
            IN WORDS: {content.totalAmountInWords}
          </div>
        </div>

        <div className="mt-4 text-xs space-y-1">
          <div><span className="font-semibold">Note:</span> <span dangerouslySetInnerHTML={{ __html: content.note }}></span></div>
          <div><span className="font-semibold">Delivery Terms:</span> <span dangerouslySetInnerHTML={{ __html: content.deliveryTerms }}></span></div>
          <div><span className="font-semibold">Payment Terms:</span> <span dangerouslySetInnerHTML={{ __html: content.paymentTerms }}></span></div>
        </div>

        <div className="mt-6 text-sm">
          Hope our rate is acceptable to you and awaiting your valued order. If you have any queries
          concerning our offer, please do not hesitate to contact us at this number {content.mobileNumber}.
        </div>

        <div className="mt-8">
          <div className="text-xl font-semibold">HIGH RANGE STAR TRADING & CONTRACTING W.L.L</div>
          <a href={`mailto:${content.email}`} className="text-brand-600 underline text-sm"><b>{content.email}</b></a><br/>
          <a href={`mailto:${content.email}`} className="text-brand-600 underline text-sm"><b>Mobile: {content.mobileNumber}</b></a>

        </div>
      </div>

      <div className="relative h-32">
        <Image src="/assets/Quotationfooter.png" alt="Footer" fill className="object-contain" />
      </div>
    </div>
  );
}


