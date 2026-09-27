import React, { useState } from 'react';
import { X, Check, Save, Fish, Building2, MapPin, Calendar, Users, Info } from 'lucide-react';
import type { FarmProfile, FishSpecies, CultureType } from '../types';

interface FarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FarmProfile;
  onSave: (updated: FarmProfile) => void;
}

const FISH_SPECIES_OPTIONS: { species: FishSpecies; optimal: string; info: string }[] = [
  {
    species: 'Tilapia',
    optimal: 'Temp: 26-32°C | pH: 6.5-8.5 | Turb: <50 NTU',
    info: 'Robust warmwater fish. High tolerance to environmental shifts, but susceptible below 20°C.'
  },
  {
    species: 'Rohu',
    optimal: 'Temp: 25-31°C | pH: 7.0-8.5 | Turb: <35 NTU',
    info: 'Indian Major Carp. Column feeder, vulnerable to water acidity (<6.5) and sudden silt spikes.'
  },
  {
    species: 'Catla',
    optimal: 'Temp: 25-32°C | pH: 7.2-8.5 | Turb: <40 NTU',
    info: 'Fast-growing surface feeder. High oxygen consumption, sensitive to low pH and surface film.'
  },
  {
    species: 'Mrigal',
    optimal: 'Temp: 24-32°C | pH: 7.0-8.5 | Turb: <45 NTU',
    info: 'Bottom dwelling Indian carp. Tolerates moderate silt, vulnerable to anaerobic pond muck.'
  },
  {
    species: 'Common Carp',
    optimal: 'Temp: 20-28°C | pH: 6.8-8.2 | Turb: <50 NTU',
    info: 'Very hardy eurythermal species. Performs well in cooler conditions down to 18°C.'
  },
  {
    species: 'Other',
    optimal: 'Temp: 24-30°C | pH: 6.5-8.5 | Turb: <50 NTU',
    info: 'Standard freshwater tropical aquaculture reference parameters.'
  }
];

const CULTURE_TYPES: CultureType[] = ['Pond', 'Biofloc', 'RAS', 'Cage', 'Other'];

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave
}) => {
  const [formData, setFormData] = useState<FarmProfile>({ ...profile });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const selectedSpeciesMeta = FISH_SPECIES_OPTIONS.find(s => s.species === formData.fishSpecies);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Fish className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Farm & Pond Configuration</h3>
              <p className="text-xs text-slate-400">
                Grounds Gemini recommendations in your specific species and pond setup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Farm Name & Pond Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Farm Name
              </label>
              <input
                type="text"
                value={formData.farmName}
                onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                placeholder="e.g. Green Valley Aquaculture"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Pond / Enclosure Name
              </label>
              <input
                type="text"
                value={formData.pondName}
                onChange={(e) => setFormData({ ...formData, pondName: e.target.value })}
                placeholder="e.g. Nursery Pond A"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Fish Species Selection (PRD Section 8) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Fish className="w-3.5 h-3.5 text-cyan-400" />
              Target Fish Species
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {FISH_SPECIES_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.species}
                  onClick={() => setFormData({ ...formData, fishSpecies: item.species })}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                    formData.fishSpecies === item.species
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.species}</span>
                    {formData.fishSpecies === item.species && (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected species optimal note */}
            {selectedSpeciesMeta && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="text-cyan-400 font-mono font-semibold">
                  {selectedSpeciesMeta.optimal}
                </div>
                <p className="text-slate-400 text-[11px]">
                  {selectedSpeciesMeta.info}
                </p>
              </div>
            )}
          </div>

          {/* Culture Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Aquaculture System / Culture Type
            </label>
            <div className="flex flex-wrap gap-2">
              {CULTURE_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({ ...formData, cultureType: type })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    formData.cultureType === type
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Pond Size, Fish Age, Stock Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Pond Area
              </label>
              <input
                type="text"
                value={formData.pondSize}
                onChange={(e) => setFormData({ ...formData, pondSize: e.target.value })}
                placeholder="e.g. 1000 m2"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                Fish Age
              </label>
              <input
                type="text"
                value={formData.fishAge}
                onChange={(e) => setFormData({ ...formData, fishAge: e.target.value })}
                placeholder="e.g. 3 months"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                Approx. Stock
              </label>
              <input
                type="text"
                value={formData.approxStock}
                onChange={(e) => setFormData({ ...formData, approxStock: e.target.value })}
                placeholder="e.g. 5000 fingerlings"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
            <span>
              Updating these parameters will instantly recalibrate target ranges and guide Gemini's contextual evaluations.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Farm Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
