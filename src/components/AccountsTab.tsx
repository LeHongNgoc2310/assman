import React, { useState, useEffect } from 'react';
import { BrokerageAccount, BrokerType } from '../types';
import { formatVND } from '../utils';
import { Plus, Trash2, Edit2, ShieldAlert, Check, Landmark, X } from 'lucide-react';

interface AccountsTabProps {
  accounts: BrokerageAccount[];
  onAddAccount: (account: Omit<BrokerageAccount, 'id'>) => void;
  onEditAccount: (id: string, updated: Partial<BrokerageAccount>) => void;
  onDeleteAccount: (id: string) => void;
}

export interface BrokerDetail {
  code: string;       // VSD depository member code
  shortName: string;   // Short code
  fullName: string;    // Registered legal entity name
  color: string;       // Visual brand color
}

// Vietnam's securities companies sorted strictly by VSD depository member code ascendingly
export const SECURITIES_COMPANIES: BrokerDetail[] = [
  { code: '001', shortName: 'HBS', fullName: 'Chứng khoán Hoà Bình', color: '#B91C1C' },
  { code: '002', shortName: 'BVS', fullName: 'Chứng khoán Bảo Việt', color: '#1B3B6F' },
  { code: '003', shortName: 'DAS', fullName: 'Chứng khoán Đông Á', color: '#1D4ED8' },
  { code: '004', shortName: 'KIS', fullName: 'Chứng khoán KIS Việt Nam', color: '#0369A1' },
  { code: '005', shortName: 'ACBS', fullName: 'Chứng khoán ACBS', color: '#C2410C' },
  { code: '006', shortName: 'BSC', fullName: 'Chứng khoán BIDV', color: '#3B82F6' },
  { code: '011', shortName: 'HPC', fullName: 'Chứng khoán Hải Phòng', color: '#15803D' },
  { code: '012', shortName: 'CTS', fullName: 'Chứng khoán Vietinbank', color: '#0F766E' },
  { code: '017', shortName: 'MBS', fullName: 'Chứng khoán MB', color: '#6D28D9' },
  { code: '018', shortName: 'MAS', fullName: 'Chứng khoán Mirae Asset', color: '#0E7490' },
  { code: '021', shortName: 'DNSE', fullName: 'Chứng khoán DNSE', color: '#CE1126' },
  { code: '022', shortName: 'TCSC', fullName: 'Chứng khoán Thành Công', color: '#B45309' },
  { code: '023', shortName: 'VND', fullName: 'Chứng khoán VNDIRECT', color: '#F97316' },
  { code: '024', shortName: 'VIS', fullName: 'Chứng khoán Quốc tế Việt Nam', color: '#4338CA' },
  { code: '026', shortName: 'APSC', fullName: 'Chứng khoán Alpha', color: '#059669' },
  { code: '031', shortName: 'TVB', fullName: 'Chứng khoán Trí Việt', color: '#BE185D' },
  { code: '033', shortName: 'APG', fullName: 'Chứng khoán APG', color: '#374151' },
  { code: '036', shortName: 'EVS', fullName: 'Chứng khoán Everest', color: '#5B21B6' },
  { code: '038', shortName: 'TVS', fullName: 'Chứng khoán Thiên Việt', color: '#78350F' },
  { code: '041', shortName: 'VDSC', fullName: 'Chứng khoán Rồng Việt', color: '#1D1E2C' },
  { code: '043', shortName: 'BETA', fullName: 'Chứng khoán BETA', color: '#4B5563' },
  { code: '044', shortName: 'VIX', fullName: 'Chứng khoán VIX', color: '#DC2626' },
  { code: '045', shortName: 'PHS', fullName: 'Chứng khoán Phú Hưng', color: '#2E7D32' },
  { code: '046', shortName: 'ASEAN', fullName: 'Chứng khoán ASEAN', color: '#1A237E' },
  { code: '062', shortName: 'VCBS', fullName: 'Chứng khoán Vietcombank', color: '#15803D' },
  { code: '068', shortName: 'VCI', fullName: 'Chứng khoán Vietcap', color: '#1E3A8A' },
  { code: '069', shortName: 'SHS', fullName: 'Chứng khoán Sài Gòn - Hà Nội', color: '#880E4F' },
  { code: '071', shortName: 'NSI', fullName: 'Chứng khoán Quốc Gia', color: '#4E342E' },
  { code: '073', shortName: 'TPS', fullName: 'Chứng khoán Tiên Phong', color: '#E11D48' },
  { code: '075', shortName: 'TVSI', fullName: 'Chứng khoán Tân Việt', color: '#9A3412' },
  { code: '086', shortName: 'KBSV', fullName: 'Chứng khoán KB Việt Nam', color: '#FBBF24' },
  { code: '094', shortName: 'Pinetree', fullName: 'Chứng khoán Pinetree', color: '#10B981' },
  { code: '096', shortName: 'KAFI', fullName: 'Chứng khoán Kafi', color: '#6366F1' },
  { code: '101', shortName: 'VFS', fullName: 'Chứng khoán Nhất Việt', color: '#A21CAF' },
  { code: '105', shortName: 'SSI', fullName: 'Chứng khoán SSI', color: '#E02424' },
  { code: '111', shortName: 'VPS', fullName: 'Chứng khoán VPS', color: '#EAB308' },
  { code: '117', shortName: 'TCBS', fullName: 'Chứng khoán Techcombank', color: '#2563EB' },
  { code: '120', shortName: 'YSVN', fullName: 'Chứng khoán Yuanta Việt Nam', color: '#22C55E' },
  { code: '121', shortName: 'SSV', fullName: 'Chứng khoán Shinhan Việt Nam', color: '#3B82F6' },
  { code: '999', shortName: 'Khác', fullName: 'Công ty Chứng khoán Khác', color: '#6B7280' }
];

export default function AccountsTab({
  accounts,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: AccountsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedCompanyIdx, setSelectedCompanyIdx] = useState<number>(34); // Defaults to 'SSI' at index 34
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [color, setColor] = useState('#E02424');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCash, setEditCash] = useState<number>(0);

  // Automatically expand the "Tạo tài khoản" form ONCE on mount if there are no linked broker accounts inside session
  useEffect(() => {
    if (accounts.length === 0) {
      setShowAddForm(true);
    }
  }, []); // Only runs once on mount to avoid locking the form open when accounts has 0 items

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const company = SECURITIES_COMPANIES[selectedCompanyIdx];

    onAddAccount({
      name: name.trim(),
      broker: company.shortName,
      cashBalance,
      color,
    });

    // Reset inputs
    setName('');
    setCashBalance(0);
    setShowAddForm(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onEditAccount(id, {
      name: editName,
      cashBalance: editCash,
    });
    setEditingId(null);
  };

  return (
    <div id="accounts-tab" className="space-y-6">

      {/* Safety and Security Compliancy Disclaimer Banner */}
      <div id="security-assurance-banner" className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4 flex items-start space-x-3 text-emerald-400">
        <ShieldAlert className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs">
          <p className="font-bold text-emerald-100">Cam kết bảo mật & An toàn tài sản (Read-Only Compliance)</p>
          <p className="text-zinc-400 mt-1 leading-relaxed">
            Ứng dụng AssMan liên tục tuân thủ nguyên tắc <strong>chỉ đọc dữ liệu (read-only tracking)</strong>. Chúng tôi <strong>không bao giờ</strong> yêu cầu bạn nhập mật khẩu giao dịch hay chìa khóa API nhạy cảm của các công ty chứng khoán. Tất cả dữ liệu danh mục được bảo mật cục bộ và thuộc sở hữu hoàn toàn của bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 1. List of Connected Brokers / Accounts */}
        <div className={`space-y-4 font-sans text-xs transition-all duration-300 ${showAddForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex justify-between items-center select-none">
            <h3 className="text-sm font-bold text-zinc-150">Tài khoản CTCK ({accounts.length})</h3>
            {!showAddForm && (
              <button
                id="show-add-account-btn"
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm tài khoản</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const isEditing = editingId === acc.id;

              return (
                <div
                  key={acc.id}
                  id={`account-card-${acc.id}`}
                  className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl relative shadow-xs hover:border-zinc-700/60 transition flex flex-col justify-between"
                >
                  {/* Visual Left colored indicator board */}
                  <div
                    style={{ backgroundColor: acc.color }}
                    className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                  />

                  {/* Account Header */}
                  <div>
                    <div className="flex justify-between items-start pl-2">
                      <div className="w-full">
                        {isEditing ? (
                          <input
                            id={`edit-acc-name-${acc.id}`}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-sm font-bold text-zinc-100 border-b border-zinc-700 bg-zinc-950 focus:outline-hidden focus:border-emerald-500 py-0.5 px-1.5 w-full rounded-md"
                          />
                        ) : (
                          <h4 className="font-bold text-sm text-zinc-100 font-sans">{acc.name}</h4>
                        )}
                        <span className="inline-block mt-2 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-zinc-850 border border-zinc-750 text-zinc-400 rounded-sm">
                          Broker: {acc.broker}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (isEditing) {
                            handleSaveEdit(acc.id);
                          } else {
                            setEditingId(acc.id);
                            setEditName(acc.name);
                            setEditCash(acc.cashBalance);
                          }
                        }}
                        className="text-zinc-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer shrink-0 ml-2"
                        title={isEditing ? "Lưu thay đổi" : "Sửa tài khoản"}
                      >
                        {isEditing ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Edit2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Balance display or modify input */}
                    <div className="mt-4 pl-2 space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wide select-none">Tiền mặt ròng (Cash)</span>
                      {isEditing ? (
                        <div className="flex items-center space-x-1 mt-1">
                          <input
                            id={`edit-acc-cash-${acc.id}`}
                            type="number"
                            value={editCash}
                            onChange={(e) => setEditCash(Number(e.target.value))}
                            className="text-sm font-extrabold text-zinc-100 bg-zinc-950 border border-zinc-750 px-2.5 py-1.5 rounded-lg w-full focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-zinc-500 font-bold select-none">đ</span>
                        </div>
                      ) : (
                        <p className="text-base font-extrabold text-zinc-100 font-mono mt-1">
                          {formatVND(acc.cashBalance)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Account Footer details */}
                  <div className="mt-5 pt-3 border-t border-zinc-800/60 pl-2 flex justify-between items-center select-none">
                    <span className="text-[9px] font-mono text-zinc-500">
                      {acc.lastImportedAt
                        ? `Đồng bộ: ${new Date(acc.lastImportedAt).toLocaleDateString('vi-VN')}`
                        : 'Chưa có vị thế nào'
                      }
                    </span>

                    <button
                      id={`delete-account-btn-${acc.id}`}
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.name}"? Thao tác này sẽ xóa tất cả danh mục của tài khoản này.`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer transition"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}

            {accounts.length === 0 && (
              <div className="col-span-2 bg-zinc-950 rounded-2xl py-12 text-center text-zinc-500 border border-dashed border-zinc-800 select-none w-full">
                <Landmark className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">Chưa thiết lập tài khoản CTCK nào.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Vui lòng nhấn nút "Thêm tài khoản" ở góc trên để liên kết tài khoản đầu tiên của bạn.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Adding interactive Form */}
        {showAddForm && (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs h-fit animate-fade-in lg:col-span-1">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4 select-none">
              <div className="flex items-center space-x-2">
                <Landmark className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-200">Tạo tài khoản mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Đóng / Hủy bỏ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
              {/* Account name */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Tên tài khoản gợi nhớ</label>
                <input
                  id="new-account-name-input"
                  type="text"
                  placeholder="Ví dụ: SSI - Chiến Lược Tích Sản"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-650"
                />
              </div>

              {/* Broker dropdown option strictly sorted by depository code */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Công ty chứng khoán (Chọn theo mã lưu ký VSD)</label>
                <select
                  id="new-account-broker-select"
                  value={selectedCompanyIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedCompanyIdx(idx);
                    const company = SECURITIES_COMPANIES[idx];
                    setColor(company.color);
                  }}
                  className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-350 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer scrollbar-thin"
                >
                  {SECURITIES_COMPANIES.map((company, index) => (
                    <option key={company.code + company.shortName} value={index}>
                      [{company.code}] {company.shortName} - {company.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cash setup */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Tiền mặt nhàn rỗi ban đầu (VND)</label>
                <input
                  id="new-account-cash-input"
                  type="number"
                  min="0"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Color preview selection */}
              <div className="space-y-1 select-none">
                <label className="font-semibold text-zinc-300 block">Màu sắc danh mục</label>
                <div className="grid grid-cols-8 gap-1.5 mt-1">
                  {SECURITIES_COMPANIES.filter((_, idx) => idx % 5 === 0 || idx === selectedCompanyIdx || idx === 34 || idx === 35 || idx === 36).map((comp) => (
                    <button
                      key={comp.code + '-col'}
                      type="button"
                      onClick={() => setColor(comp.color)}
                      style={{ backgroundColor: comp.color }}
                      title={comp.shortName}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition ${
                        color === comp.color ? 'border-zinc-100 scale-110 shadow-sm' : 'border-transparent hover:scale-105 hover:border-zinc-650'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit & Cancel triggers */}
              <div className="flex items-center space-x-2 mt-4 select-none pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-bold cursor-pointer transition text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-add-account-btn"
                  type="submit"
                  className="flex-[2] py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-extrabold cursor-pointer transition shadow-xs"
                >
                  Khai sinh
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
