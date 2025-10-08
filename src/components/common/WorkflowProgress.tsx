"use client";

import React from "react";

interface WorkflowStep {
  id: string;
  title: string;
  date?: string;
  status: "completed" | "active" | "pending";
  statusText: string;
  action?: {
    label: string;
    onClick: () => void;
    variant: "view" | "create";
  };
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  className?: string;
}

export default function WorkflowProgress({ steps, className = "" }: WorkflowProgressProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isPending = step.status === "pending";

          return (
            <div key={step.id} className="flex items-start gap-4">
              {/* Step Icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    isCompleted
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : isActive
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isActive ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 mt-2 ${
                      isCompleted ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {step.title}
                    </h3>
                    {step.date && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {step.date}
                      </p>
                    )}
                    <p
                      className={`text-sm mt-1 ${
                        isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step.statusText}
                    </p>
                  </div>

                  {/* Action Button */}
                  {step.action && (
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={step.action.onClick}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          step.action.variant === "create"
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {step.action.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mobile-optimized version for smaller screens
export function WorkflowProgressMobile({ steps, className = "" }: WorkflowProgressProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 ${className}`}>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isPending = step.status === "pending";

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Step Icon - Smaller for mobile */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-6 mt-1 ${
                      isCompleted ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {step.title}
                    </h3>
                    <p
                      className={`text-xs mt-0.5 ${
                        isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step.statusText}
                    </p>
                  </div>

                  {/* Action Button - Smaller for mobile */}
                  {step.action && (
                    <div className="ml-2 flex-shrink-0">
                      <button
                        onClick={step.action.onClick}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                          step.action.variant === "create"
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {step.action.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
