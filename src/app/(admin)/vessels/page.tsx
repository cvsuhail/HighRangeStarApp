"use client";

import React, { useMemo, useState, useEffect } from "react";
import { VesselService } from "@/lib/vesselService";
import type { Vessel, CreateVesselData } from "@/types/vessel";
import { useAuth } from "@/context/AuthContext";

export default function VesselsPage() {
  const { user, loading: authLoading } = useAuth();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateVesselData>({ name: "", number: "", slnoFormat: "H##", code: "" });
  const [codeEdited, setCodeEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isEditing = useMemo(() => !!editingId, [editingId]);

  const resetForm = () => {
    setForm({ name: "", number: "", slnoFormat: "H##", code: "" });
    setCodeEdited(false);
  };

  const generateVesselCode = (name: string, number: string) => {
    const firstAlpha = (name || "").trim().toUpperCase().replace(/[^A-Z]/g, "").charAt(0);
    const digits = (number || "").replace(/[^0-9]/g, "");
    return `${firstAlpha}${digits}`.trim();
  };

  // Load vessels when authenticated
  useEffect(() => {
    if (!authLoading && user) {
      loadVessels();
    }
  }, [authLoading, user]);

  const loadVessels = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedVessels = await VesselService.getVessels();
      setVessels(fetchedVessels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vessels');
    } finally {
      setLoading(false);
    }
  };

  // Filter vessels based on search term
  const filteredVessels = useMemo(() => {
    if (!searchTerm.trim()) return vessels;
    
    const term = searchTerm.toLowerCase();
    return vessels.filter(vessel =>
      vessel.name.toLowerCase().includes(term) ||
      vessel.number.toLowerCase().includes(term) ||
      vessel.code.toLowerCase().includes(term)
    );
  }, [vessels, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError('Please sign in to perform this action.');
    if (!form.name.trim()) return alert("Vessel name is required");
    if (!form.number.trim()) return alert("Vessel number is required");
    if (!form.code.trim()) return alert("Vessel code is required");

    try {
      setLoading(true);
      setError(null);

      if (isEditing) {
        // Check for duplicates before updating
        const numberExists = await VesselService.checkVesselNumberExists(form.number, editingId ?? undefined);
        const codeExists = await VesselService.checkVesselCodeExists(form.code, editingId ?? undefined);
        
        if (numberExists) return alert("Vessel number already exists");
        if (codeExists) return alert("Vessel code already exists");

        const updatedVessel = await VesselService.updateVessel(editingId!, { ...form, updatedAt: new Date().toISOString() });
        setVessels(prev => prev.map(v => v.id === editingId! ? updatedVessel : v));
        setEditingId(null);
      } else {
        // Check for duplicates before creating
        const numberExists = await VesselService.checkVesselNumberExists(form.number);
        const codeExists = await VesselService.checkVesselCodeExists(form.code);
        
        if (numberExists) return alert("Vessel number already exists");
        if (codeExists) return alert("Vessel code already exists");

        const newVessel = await VesselService.createVessel(form);
        setVessels(prev => [newVessel, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vessel');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (v: Vessel) => {
    setEditingId(v.id);
    setForm({ name: v.name, number: v.number, slnoFormat: v.slnoFormat, code: v.code });
    setCodeEdited(true);
  };

  const remove = async (id: string) => {
    if (!user) return setError('Please sign in to perform this action.');
    if (!confirm("Delete this vessel?")) return;
    
    try {
      setLoading(true);
      setError(null);
      await VesselService.deleteVessel(id);
      setVessels(prev => prev.filter(v => v.id !== id));
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vessel');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Vessels</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage vessels: add, edit, delete</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search vessels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
          />
          <button
            onClick={loadVessels}
            disabled={loading || !user}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{isEditing ? "Edit Vessel" : "Add Vessel"}</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Vessel Name</label>
              <input value={form.name} onChange={(e)=>{
                const name = e.target.value;
                setForm((prev)=>{
                  const next = { ...prev, name };
                  if (!codeEdited) next.code = generateVesselCode(name, next.number);
                  return next;
                });
              }} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Vessel Number</label>
              <input value={form.number} onChange={(e)=>{
                const number = e.target.value;
                setForm((prev)=>{
                  const next = { ...prev, number };
                  if (!codeEdited) next.code = generateVesselCode(next.name, number);
                  return next;
                });
              }} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">SLNO Format</label>
              <input value={form.slnoFormat} onChange={(e)=>setForm({...form, slnoFormat:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <p className="mt-1 text-[11px] text-gray-500">Use # for digits, e.g., H## → H01, H02</p>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Vessel Code</label>
              <input value={form.code} onChange={(e)=>{ setCodeEdited(true); setForm({...form, code:e.target.value}); }} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <p className="mt-1 text-[11px] text-gray-500">Auto-generates from name and number (e.g., HALUL + 45 → H45). You can edit.</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              {isEditing && <button type="button" onClick={()=>{ setEditingId(null); resetForm(); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700" disabled={loading}>Cancel</button>}
              <button type="submit" className="px-4 py-2 rounded-md bg-brand-600 text-white disabled:opacity-50" disabled={loading || !user}>
                {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update" : "Add")}
              </button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-white">Vessel List</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Number</th>
                  <th className="text-left font-semibold px-4 py-3">SLNO Format</th>
                  <th className="text-left font-semibold px-4 py-3">Code</th>
                  <th className="text-right font-semibold px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredVessels.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{v.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.number}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.slnoFormat}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.code}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={()=>startEdit(v)} className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800" disabled={loading || !user}>Edit</button>
                        <button onClick={()=>remove(v.id)} className="px-2 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30" disabled={loading || !user}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Loading vessels...</td>
                  </tr>
                )}
                {!loading && filteredVessels.length === 0 && vessels.length > 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No vessels match your search</td>
                  </tr>
                )}
                {!loading && vessels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">{user ? 'No vessels added yet' : 'Please sign in to view vessels'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


