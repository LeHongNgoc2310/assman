import React, { useState, useEffect } from 'react';
import { BrokerageAccount, BrokerType, PortfolioPosition } from '../types';
import { formatVND } from '../utils';
import { Plus, Trash2, Edit2, ShieldAlert, Check, Landmark, X } from 'lucide-react';
import ImportDataTab from './ImportDataTab';

interface AccountsTabProps {
  accounts: BrokerageAccount[];
  onAddAccount: (account: Omit<BrokerageAccount, 'id'>) => void;
  onEditAccount: (id: string, updated: Partial<BrokerageAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onImportPositions: (accountId: string, newPositions: Omit<PortfolioPosition, 'id' | 'currentPrice' | 'updatedAt'>[], mode: 'add' | 'overwrite') => void;
  onAddHistoryItem: (history: { fileName: string; accountId: string; status: 'Completed' | 'Failed'; importedCount: number; failedCount: number; errorLog?: string[] }) => void;
}

export interface BrokerDetail {
  code: string;       // VSD depository member code
  shortName: string;   // Short code
  fullName: string;    // Registered legal entity name
  color: string;       // Visual brand color
}

// Vietnam's securities companies sorted strictly by VSD depository member code ascendingly
const RAW_SECURITIES_COMPANIES: BrokerDetail[] = [
  { code: '001', shortName: 'BVSC', fullName: 'Công ty Cổ phần Chứng khoán Bảo Việt', color: '#1B3B6F' },
  { code: '002', shortName: 'BSC', fullName: 'Công ty Cổ phần Chứng khoán BIDV', color: '#3B82F6' },
  { code: '003', shortName: 'SSI', fullName: 'Công ty Cổ phần Chứng khoán SSI', color: '#E02424' },
  { code: '004', shortName: 'YSVN', fullName: 'Công ty TNHH Chứng khoán Yuanta Việt Nam', color: '#16A34A' },
  { code: '005', shortName: 'MBS', fullName: 'Công ty Cổ phần Chứng khoán MB', color: '#6D28D9' },
  { code: '006', shortName: 'ACBS', fullName: 'Công ty TNHH Chứng khoán ACB', color: '#C2410C' },
  { code: '007', shortName: 'CTS', fullName: 'Công ty Cổ phần Chứng khoán VietinBank', color: '#0F766E' },
  { code: '008', shortName: 'AGRISECO', fullName: 'Công ty Cổ phần Chứng khoán Agribank', color: '#15803D' },
  { code: '009', shortName: 'VCBS', fullName: 'Công ty TNHH Chứng khoán Ngân hàng Ngoại thương Việt Nam', color: '#22C55E' },
  { code: '010', shortName: 'Pinetree', fullName: 'Công ty Cổ phần Chứng khoán Pinetree', color: '#10B981' },
  { code: '011', shortName: 'HSC', fullName: 'Công ty Cổ phần Chứng khoán Thành phố Hồ Chí Minh', color: '#0369A1' },
  { code: '012', shortName: 'HASECO', fullName: 'Công ty Cổ phần Chứng khoán Hải Phòng', color: '#15803D' },
  { code: '014', shortName: 'VIKKIBANKS', fullName: 'Công ty TNHH MTV Chứng khoán Ngân hàng số VIKKI', color: '#8B5CF6' },
  { code: '016', shortName: 'DVSC', fullName: 'Công ty Cổ phần Chứng khoán Đại Việt', color: '#374151' },
  { code: '017', shortName: 'SBS', fullName: 'Công ty Cổ phần Chứng khoán SBS', color: '#BE185D' },
  { code: '018', shortName: 'ABSC', fullName: 'Công ty Cổ phần Chứng khoán An Bình', color: '#4F46E5' },
  { code: '020', shortName: 'OCBS', fullName: 'Công ty Cổ phần Chứng khoán OCBS', color: '#4338CA' },
  { code: '021', shortName: 'VND', fullName: 'Công ty Cổ phần Chứng khoán VNDIRECT', color: '#F97316' },
  { code: '022', shortName: 'PHS', fullName: 'Công ty Cổ phần Chứng khoán Phú Hưng', color: '#2E7D32' },
  { code: '023', shortName: 'VSC', fullName: 'Công ty Cổ phần Chứng khoán Việt', color: '#18181B' },
  { code: '024', shortName: 'DSC', fullName: 'Công ty Cổ phần Chứng khoán DSC', color: '#D97706' },
  { code: '026', shortName: 'VPS', fullName: 'Công ty Cổ phần Chứng khoán VPS', color: '#EAB308' },
  { code: '028', shortName: 'NSI', fullName: 'Công ty Cổ phần Chứng khoán Quốc Gia', color: '#4E342E' },
  { code: '029', shortName: 'PBSV', fullName: 'Công ty TNHH Chứng khoán Ngân hàng Public Việt Nam', color: '#0F766E' },
  { code: '030', shortName: 'APEC', fullName: 'Công ty Cổ phần Chứng khoán Châu Á - Thái Bình Dương', color: '#EF4444' },
  { code: '032', shortName: 'ASEAN', fullName: 'Công ty Cổ phần Chứng khoán ASEAN', color: '#1A237E' },
  { code: '033', shortName: 'VDSC', fullName: 'Công ty Cổ phần Chứng khoán Rồng Việt', color: '#1D1E2C' },
  { code: '036', shortName: 'APSC', fullName: 'Công ty Cổ phần Chứng khoán Alpha', color: '#059669' },
  { code: '037', shortName: 'TVSC', fullName: 'Công ty Cổ phần Chứng khoán T-Cap', color: '#9D174D' },
  { code: '038', shortName: 'VTGS', fullName: 'Công ty Cổ phần Chứng khoán VTG', color: '#4B5563' },
  { code: '039', shortName: 'NHSV', fullName: 'Công ty TNHH Chứng khoán NH Việt Nam', color: '#1E40AF' },
  { code: '040', shortName: 'EVS', fullName: 'Công ty Cổ phần Chứng khoán EVS', color: '#5B21B6' },
  { code: '042', shortName: 'TVS', fullName: 'Công ty Cổ phần Chứng khoán Thiên Việt', color: '#78350F' },
  { code: '044', shortName: 'TVSI', fullName: 'Công ty Cổ phần Chứng khoán Tân Việt', color: '#9A3412' },
  { code: '045', shortName: 'PSI', fullName: 'Công ty Cổ phần Chứng khoán Dầu khí', color: '#0284C7' },
  { code: '046', shortName: 'HDS', fullName: 'Công ty Cổ phần Chứng khoán HD', color: '#DC2626' },
  { code: '047', shortName: 'SMDS', fullName: 'Công ty Cổ phần Chứng khoán SMARTMIND', color: '#52525B' },
  { code: '048', shortName: 'TPS', fullName: 'Công ty Cổ phần Chứng khoán Tiên Phong', color: '#E11D48' },
  { code: '049', shortName: 'KAFI', fullName: 'Công ty Cổ phần Chứng khoán KAFI', color: '#6366F1' },
  { code: '050', shortName: 'JBSV', fullName: 'Công ty TNHH Chứng khoán JB Việt Nam', color: '#0369A1' },
  { code: '057', shortName: 'KIS', fullName: 'Công ty Cổ phần Chứng khoán KIS Việt Nam', color: '#2563EB' },
  { code: '058', shortName: 'FTS', fullName: 'Công ty Cổ phần Chứng khoán FPT', color: '#0284C7' },
  { code: '059', shortName: 'UPSC', fullName: 'Công ty Cổ phần Chứng khoán UP', color: '#0F766E' },
  { code: '061', shortName: 'GTJA', fullName: 'Công ty Cổ phần Chứng khoán Guotai Junan (Việt Nam)', color: '#7C3AED' },
  { code: '064', shortName: 'DNSE', fullName: 'Công ty Cổ phần Chứng khoán DNSE', color: '#CE1126' },
  { code: '065', shortName: 'BIS', fullName: 'Công ty Cổ phần Chứng khoán BIS', color: '#6B7280' },
  { code: '067', shortName: 'APG', fullName: 'Công ty Cổ phần Chứng khoán APG', color: '#374151' },
  { code: '068', shortName: 'VCI', fullName: 'Công ty cổ phần chứng khoán Vietcap', color: '#1E3A8A' },
  { code: '072', shortName: 'VIX', fullName: 'Công ty Cổ phần Chứng khoán VIX', color: '#DC2626' },
  { code: '073', shortName: 'WSS', fullName: 'Công ty Cổ phần Chứng khoán Phố Wall', color: '#15803D' },
  { code: '075', shortName: 'BSI', fullName: 'Công ty Cổ phần Chứng khoán Beta', color: '#4B5563' },
  { code: '076', shortName: 'VISC', fullName: 'Công ty cổ phần Chứng khoán Đầu tư Tài chính Việt Nam', color: '#4F46E5' },
  { code: '077', shortName: 'MAS', fullName: 'Công ty Cổ phần Chứng khoán Mirae Asset (Việt Nam)', color: '#0E7490' },
  { code: '079', shortName: 'MSVN', fullName: 'Công ty TNHH Chứng khoán Maybank', color: '#FBBF24' },
  { code: '080', shortName: 'ECC', fullName: 'Công ty Cổ phần Chứng khoán Eurocapital', color: '#374151' },
  { code: '081', shortName: 'SSV', fullName: 'Công ty TNHH Chứng khoán Shinhan Việt Nam', color: '#4F46E5' },
  { code: '082', shortName: 'HBS', fullName: 'Công ty cổ phần Chứng khoán Hòa Bình', color: '#B91C1C' },
  { code: '083', shortName: 'ARTEX', fullName: 'Công ty cổ phần Chứng khoán Artex', color: '#880E4F' },
  { code: '085', shortName: 'TCSC', fullName: 'Công ty CP chứng khoán Thành Công', color: '#B45309' },
  { code: '086', shortName: 'BMSC', fullName: 'Công ty Cổ phần Chứng khoán Bảo Minh', color: '#3F3F46' },
  { code: '088', shortName: 'SBSI', fullName: 'Công ty Cổ phần Chứng khoán Stanley Brothers', color: '#D97706' },
  { code: '089', shortName: 'VTS', fullName: 'Công ty Cổ phần Chứng khoán Việt Thành', color: '#0F766E' },
  { code: '090', shortName: 'NVS', fullName: 'Công ty Cổ phần Chứng khoán Navibank', color: '#4B5563' },
  { code: '091', shortName: 'KBSV', fullName: 'Công ty Cổ phần Chứng khoán KB Việt Nam', color: '#FBBF24' },
  { code: '092', shortName: 'SBBS', fullName: 'Công ty cổ phần Chứng khoán SBB', color: '#1B3B6F' },
  { code: '093', shortName: 'FNS', fullName: 'Công ty Cổ phần Chứng khoán Funan', color: '#BE185D' },
  { code: '094', shortName: 'VFS', fullName: 'Công ty Cổ phần Chứng khoán Nhật Việt', color: '#A21CAF' },
  { code: '099', shortName: 'ASAM', fullName: 'Công ty Cổ phần Chứng khoán ASAM', color: '#374151' },
  { code: '101', shortName: 'JSI', fullName: 'Công ty TNHH Chứng khoán Nhật Bản', color: '#DC2626' },
  { code: '102', shortName: 'VNSC', fullName: 'Công ty Cổ phần Chứng khoán Kiến thiết Việt Nam', color: '#15803D' },
  { code: '105', shortName: 'TCBS', fullName: 'Công ty Cổ phần Chứng khoán Kỹ Thương', color: '#2563EB' },
  { code: '111', shortName: 'SMARTSC', fullName: 'Công ty Cổ phần Chứng khoán SmartInvest', color: '#8D99AE' },
  { code: '116', shortName: 'VPBankS', fullName: 'Công ty Cổ phần Chứng khoán VPBank', color: '#059669' },
  { code: '118', shortName: 'AIS', fullName: 'Công ty Cổ phần Chứng khoán AIS', color: '#4B5563' },
  { code: '119', shortName: 'CASC', fullName: 'Công ty Cổ phần Chứng khoán Thủ Đô', color: '#1B3B6F' },
  { code: '120', shortName: 'FHSC', fullName: 'Công ty cổ phần Chứng khoán Finhay', color: '#7C3AED' },
  { code: '123', shortName: 'CVS', fullName: 'Công ty cổ phần Chứng khoán CV', color: '#374151' },
  { code: '999', shortName: 'Khác', fullName: 'Công ty Chứng khoán Khác', color: '#6B7280' }
];

export const SECURITIES_COMPANIES: BrokerDetail[] = [...RAW_SECURITIES_COMPANIES].sort((a, b) => {
  if (a.shortName === 'Khác' || a.code === '999') return 1;
  if (b.shortName === 'Khác' || b.code === '999') return -1;
  return a.code.localeCompare(b.code);
});

export default function AccountsTab({
  accounts,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onImportPositions,
  onAddHistoryItem,
}: AccountsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  
  const defaultIdx = SECURITIES_COMPANIES.findIndex(c => c.shortName === 'SSI');
  const [selectedCompanyIdx, setSelectedCompanyIdx] = useState<number>(defaultIdx !== -1 ? defaultIdx : 0);
  const [color, setColor] = useState(SECURITIES_COMPANIES[defaultIdx !== -1 ? defaultIdx : 0]?.color || '#E02424');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCash, setEditCash] = useState<number>(0);

  const [isSecurityBannerDismissed, setIsSecurityBannerDismissed] = useState(() => {
    return localStorage.getItem('assman_security_banner_dismissed') === 'true';
  });

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
      cashBalance: 0,
      color,
    });

    // Reset inputs
    setName('');
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
      {!isSecurityBannerDismissed && (
        <div id="security-assurance-banner" className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4 flex items-start justify-between space-x-3 text-emerald-400 relative">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs pr-6">
              <p className="font-bold text-emerald-100">Cam kết bảo mật & An toàn tài sản (Read-Only Compliance)</p>
              <p className="text-zinc-400 mt-1 leading-relaxed">
                Ứng dụng Assetly liên tục tuân thủ nguyên tắc <strong>chỉ đọc dữ liệu (read-only tracking)</strong>. Chúng tôi <strong>không bao giờ</strong> yêu cầu bạn nhập mật khẩu giao dịch hay chìa khóa API nhạy cảm của các công ty chứng khoán. Tất cả dữ liệu danh mục được bảo mật cục bộ và thuộc sở hữu hoàn toàn của bạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('assman_security_banner_dismissed', 'true');
              setIsSecurityBannerDismissed(true);
            }}
            className="text-emerald-500 hover:text-emerald-400 p-1.5 hover:bg-emerald-500/10 rounded-lg transition shrink-0 absolute top-3 right-3 cursor-pointer"
            title="Đóng / Ẩn cam kết"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col space-y-6">

        {/* 1. Adding interactive Form (Rendered at top to push content down) */}
        {showAddForm && (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-xs h-fit animate-fade-in w-full">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-5 select-none">
              <div className="flex items-center space-x-2">
                <Landmark className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Khai sinh tài khoản mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Đóng / Hủy bỏ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs">
              
              <div className="space-y-4">
                {/* Account name */}
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Tên tài khoản gợi nhớ</label>
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
                  <label className="font-semibold text-zinc-300 block">Công ty chứng khoán (Chọn theo mã VSD)</label>
                  <select
                    id="new-account-broker-select"
                    value={selectedCompanyIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedCompanyIdx(idx);
                      const company = SECURITIES_COMPANIES[idx];
                      setColor(company.color);
                    }}
                    className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer scrollbar-thin select-none"
                  >
                    {SECURITIES_COMPANIES.map((company, index) => (
                      <option key={company.code + company.shortName} value={index} className="bg-zinc-950 text-zinc-100">
                        [{company.code}] - {company.shortName} - {company.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {/* Color preview selection */}
                <div className="space-y-1 select-none">
                  <label className="font-semibold text-zinc-300 block">Màu sắc danh mục</label>
                  <p className="text-[10px] text-zinc-550 mb-2">Giúp hiển thị phân bổ tài sản đẹp mắt hơn</p>
                  <div className="flex flex-wrap gap-2 mt-1.5 max-h-[85px] overflow-y-auto border border-zinc-850 p-3 bg-zinc-950/40 rounded-xl">
                    {(() => {
                      const popularBrokers = ['SSI', 'VPS', 'VND', 'TCBS', 'MBS', 'HSC', 'MAS', 'VCI'];
                      return SECURITIES_COMPANIES.filter((comp, idx) => 
                        idx === selectedCompanyIdx || popularBrokers.includes(comp.shortName)
                      ).map((comp) => (
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
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Submit & Cancel triggers */}
              <div className="md:col-span-2 flex items-center justify-end space-x-3 select-none pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-bold cursor-pointer transition text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-add-account-btn"
                  type="submit"
                  className="px-8 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-extrabold cursor-pointer transition shadow-xs"
                >
                  Khai sinh tài khoản
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. List of Connected Brokers / Accounts */}
        <div className="space-y-4 font-sans text-xs w-full">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-sm font-bold text-zinc-150">Tài khoản CTCK hiện có ({accounts.length})</h3>
            {!showAddForm && (
              <button
                id="show-add-account-btn"
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Khai sinh tài khoản mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="col-span-full bg-zinc-950 rounded-2xl py-12 text-center text-zinc-500 border border-dashed border-zinc-800 select-none w-full">
                <Landmark className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs font-semibold text-zinc-400">Chưa thiết lập tài khoản CTCK nào.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Vui lòng nhấn nút "Khai sinh tài khoản mới" ở góc trên để liên kết tài khoản đầu tiên của bạn.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Integrated Import Data Panel */}
        {accounts.length > 0 && (
          <div className="pt-6 border-t border-zinc-850/80 space-y-4">
            <div className="select-none flex items-center space-x-2 border-b border-zinc-850 pb-2">
              <span className="bg-emerald-500 text-black w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold font-mono">2</span>
              <h3 className="text-sm font-extrabold text-zinc-150 uppercase tracking-wide">Nạp và đồng bộ hóa danh mục tài sản</h3>
            </div>
            <ImportDataTab
              accounts={accounts}
              onImportPositions={onImportPositions}
              onAddHistoryItem={onAddHistoryItem}
            />
          </div>
        )}

      </div>

    </div>
  );
}
