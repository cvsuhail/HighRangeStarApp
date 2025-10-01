"use client";

import React from "react";
import type { HRSDeliveryNoteContent } from "@/types/quotation";

interface HRSDeliveryNoteTemplateProps {
  content: HRSDeliveryNoteContent;
}

export default function HRSDeliveryNoteTemplate({ content }: HRSDeliveryNoteTemplateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
            HRS
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              HIGH RANGE STAR TRADING & CONTRACTING W.L.L.
            </div>
            <div className="text-xs text-gray-600">DOHA-QATAR, MOB: +974 5514 0143</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">تقرير الخدمة</div>
          <div className="text-xs text-gray-600">HIGH RANGE STAR</div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 underline">SERVICE REPORT</h1>
      </div>

      {/* Recipient and Report Details */}
      <div className="flex justify-between mb-8">
        <div className="w-1/2">
          <div className="space-y-2">
            <div><span className="font-semibold">To:</span> {content.partyName}</div>
            <div><span className="font-semibold">Address:</span> {content.partyAddress}</div>
            <div><span className="font-semibold">Attn:</span> {content.attn || ""}</div>
            <div><span className="font-semibold">Tel:</span> {content.tel || ""}</div>
          </div>
        </div>
        <div className="w-1/2">
          <div className="space-y-2">
            <div><span className="font-semibold">Order Date:</span> {content.orderDate}</div>
            <div><span className="font-semibold">LPO No #:</span> {content.lpoNo || ""}</div>
            <div><span className="font-semibold">Delivery Note #:</span> {content.deliveryNoteNo}</div>
            <div><span className="font-semibold">Dispatch:</span> {content.dispatchDate}</div>
          </div>
        </div>
      </div>

      {/* Service Items Table */}
      <div className="mb-8">
        <div className="text-lg font-semibold mb-4">{content.projectCode}</div>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">SL No.</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Order</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {content.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-3 py-2">{item.slNo}</td>
                <td className="border border-gray-300 px-3 py-2">{item.description}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{item.orderQty}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{item.deliveredQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="mb-8 text-sm">
        <p>
          Please check delivered good correspond with those stated on this form. Any damaged or missing goods should be marked accordingly on this form as Discrepancies Cannot be Rectified thereafter.
        </p>
      </div>

      {/* Acknowledgment Section */}
      <div className="flex justify-between items-end mb-8">
        <div className="w-1/3">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Name:</div>
              <div className="border-b border-gray-300 pb-1 min-h-[20px]">{content.receivedByName || ""}</div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Signature:</div>
              <div className="border-b border-gray-300 pb-1 min-h-[20px]"></div>
            </div>
          </div>
        </div>
        <div className="w-1/3 text-center">
          <div className="text-sm font-semibold mb-2">Stamp:</div>
          <div className="border border-gray-300 h-20 w-20 mx-auto rounded-full"></div>
        </div>
        <div className="w-1/3">
          <div>
            <div className="text-sm font-semibold mb-2">Date Received:</div>
            <div className="border-b border-gray-300 pb-1 min-h-[20px]">{content.dateReceived || ""}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-2">
        <div className="text-sm font-semibold">Thank you for your business!</div>
        <div className="text-xs text-gray-600">
          Should you have any enquiries concerning this delivery note, please contact +974 5514103
        </div>
        <div className="text-xs text-gray-600">
          COMMERCIAL REGISTRATION NO: 112983, Email: highrangestar@hotmail.com
        </div>
      </div>
    </div>
  );
}

