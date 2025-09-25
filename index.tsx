import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// --- TYPE DEFINITIONS ---
interface Receivable {
  id: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
}

interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
}

type ActiveTab = 'receivables' | 'revenues';
type EditingItem = { type: 'receivable' | 'revenue', data: Receivable | Revenue };


// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

// --- MODAL COMPONENT ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('receivables');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  
  const [isReceivableModalOpen, setReceivableModalOpen] = useState(false);
  const [isRevenueModalOpen, setRevenueModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const [currentReceivable, setCurrentReceivable] = useState<Receivable | null>(null);
  
  // --- DATA PERSISTENCE with localStorage ---
  useEffect(() => {
    try {
        const storedReceivables = localStorage.getItem('receivables');
        if (storedReceivables) setReceivables(JSON.parse(storedReceivables));
        
        const storedRevenues = localStorage.getItem('revenues');
        if (storedRevenues) setRevenues(JSON.parse(storedRevenues));
    } catch (error) {
        console.error("Gagal memuat data dari localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('receivables', JSON.stringify(receivables));
    } catch (error) {
        console.error("Gagal menyimpan data piutang:", error);
    }
  }, [receivables]);
  
  useEffect(() => {
    try {
        localStorage.setItem('revenues', JSON.stringify(revenues));
    } catch (error) {
        console.error("Gagal menyimpan data pendapatan:", error);
    }
  }, [revenues]);

  // --- HANDLER FUNCTIONS ---
  const handleAddReceivable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newReceivable: Receivable = {
      id: crypto.randomUUID(),
      description: formData.get('description') as string,
      totalAmount: parseFloat(formData.get('totalAmount') as string),
      paidAmount: 0,
      dueDate: formData.get('dueDate') as string,
    };
    setReceivables(prev => [...prev, newReceivable]);
    setReceivableModalOpen(false);
  };

  const handleAddRevenue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRevenue: Revenue = {
      id: crypto.randomUUID(),
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
    };
    setRevenues(prev => [...prev, newRevenue]);
    setRevenueModalOpen(false);
  };
  
  const handleRecordPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentReceivable) return;
    
    const formData = new FormData(e.currentTarget);
    const paymentAmount = parseFloat(formData.get('paymentAmount') as string);
    
    setReceivables(prev => prev.map(r => 
      r.id === currentReceivable.id 
        ? { ...r, paidAmount: Math.min(r.totalAmount, r.paidAmount + paymentAmount) }
        : r
    ));
    setPaymentModalOpen(false);
    setCurrentReceivable(null);
  };

  const handleDeleteReceivable = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus piutang ini?')) {
      setReceivables(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleDeleteRevenue = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pendapatan ini?')) {
      setRevenues(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleOpenEditModal = (item: Receivable | Revenue, type: 'receivable' | 'revenue') => {
    setEditingItem({ data: item, type });
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
  };
  
  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
  
    const formData = new FormData(e.currentTarget);
  
    if (editingItem.type === 'receivable') {
      const updatedReceivable: Receivable = {
        ...(editingItem.data as Receivable),
        description: formData.get('description') as string,
        totalAmount: parseFloat(formData.get('totalAmount') as string),
        dueDate: formData.get('dueDate') as string,
      };
      setReceivables(prev => prev.map(r => r.id === updatedReceivable.id ? updatedReceivable : r));
    } else { // 'revenue'
      const updatedRevenue: Revenue = {
        ...(editingItem.data as Revenue),
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        date: formData.get('date') as string,
      };
      setRevenues(prev => prev.map(r => r.id === updatedRevenue.id ? updatedRevenue : r));
    }
    handleCloseEditModal();
  };

  // --- DERIVED STATE / MEMOS ---
  const sortedReceivables = useMemo(() => 
    [...receivables].sort((a, b) => {
      const remainingA = a.totalAmount - a.paidAmount;
      const remainingB = b.totalAmount - b.paidAmount;
      if (remainingA > 0 && remainingB <= 0) return -1;
      if (remainingA <= 0 && remainingB > 0) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }), [receivables]);

  const sortedRevenues = useMemo(() => 
    [...revenues].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [revenues]
  );

  const receivablesSummary = useMemo(() => {
    return receivables.reduce((acc, curr) => {
      acc.total += curr.totalAmount;
      acc.remaining += (curr.totalAmount - curr.paidAmount);
      return acc;
    }, { total: 0, remaining: 0 });
  }, [receivables]);

  const revenuesSummary = useMemo(() => {
    return revenues.reduce((acc, curr) => {
      acc.total += curr.amount;
      return acc;
    }, { total: 0 });
  }, [revenues]);


  // --- RENDER ---
  return (
    <div className="app-container">
      <header>
        <h1>Manajemen Piutang & Pendapatan</h1>
      </header>

      <nav className="tabs">
        <button className={`tab-button ${activeTab === 'receivables' ? 'active' : ''}`} onClick={() => setActiveTab('receivables')}>Piutang</button>
        <button className={`tab-button ${activeTab === 'revenues' ? 'active' : ''}`} onClick={() => setActiveTab('revenues')}>Pendapatan</button>
      </nav>

      <main>
        {activeTab === 'receivables' && (
          <section>
            <div className="content-header">
              <h2>Daftar Piutang</h2>
              <button className="btn btn-primary" onClick={() => setReceivableModalOpen(true)}>+ Tambah Piutang</button>
            </div>
            
            <div className="summary-container">
                <div className="stat-card">
                    <span className="stat-card-label">Total Piutang Keseluruhan</span>
                    <span className="stat-card-value">{formatCurrency(receivablesSummary.total)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-card-label">Total Sisa Tagihan</span>
                    <span className="stat-card-value warning">{formatCurrency(receivablesSummary.remaining)}</span>
                </div>
            </div>

            {sortedReceivables.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Keterangan</th>
                      <th>Jatuh Tempo</th>
                      <th>Total Piutang</th>
                      <th>Sisa Piutang</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReceivables.map((r, index) => {
                      const remaining = r.totalAmount - r.paidAmount;
                      const isPaid = remaining <= 0;
                      return (
                        <tr key={r.id}>
                          <td>{index + 1}</td>
                          <td>{r.description}</td>
                          <td>{formatDate(r.dueDate)}</td>
                          <td>{formatCurrency(r.totalAmount)}</td>
                          <td>{formatCurrency(remaining)}</td>
                          <td>
                            <span className={`status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}`}>
                              {isPaid ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="actions">
                            {!isPaid && (
                                <button className="btn-pay" title="Catat Pembayaran" onClick={() => { setCurrentReceivable(r); setPaymentModalOpen(true); }}>
                                    BAYAR
                                </button>
                            )}
                             <button className="btn-icon" title="Edit" onClick={() => handleOpenEditModal(r, 'receivable')}>
                                <svg className="icon-edit" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button className="btn-icon" title="Hapus" onClick={() => handleDeleteReceivable(r.id)}>
                              <svg className="icon-delete" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
                <div className="empty-state"><p>Belum ada catatan piutang. Mulai tambahkan sekarang!</p></div>
            )}
          </section>
        )}

        {activeTab === 'revenues' && (
          <section>
            <div className="content-header">
              <h2>Daftar Pendapatan</h2>
              <button className="btn btn-primary" onClick={() => setRevenueModalOpen(true)}>+ Tambah Pendapatan</button>
            </div>

            <div className="summary-container">
                <div className="stat-card">
                    <span className="stat-card-label">Total Pendapatan</span>
                    <span className="stat-card-value success">{formatCurrency(revenuesSummary.total)}</span>
                </div>
            </div>

            {sortedRevenues.length > 0 ? (
                <div className="table-wrapper">
                    <table>
                    <thead>
                        <tr>
                        <th>No</th>
                        <th>Keterangan</th>
                        <th>Tanggal</th>
                        <th>Jumlah</th>
                        <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRevenues.map((r, index) => (
                        <tr key={r.id}>
                            <td>{index + 1}</td>
                            <td>{r.description}</td>
                            <td>{formatDate(r.date)}</td>
                            <td>{formatCurrency(r.amount)}</td>
                            <td className="actions">
                                <button className="btn-icon" title="Edit" onClick={() => handleOpenEditModal(r, 'revenue')}>
                                    <svg className="icon-edit" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                                <button className="btn-icon" title="Hapus" onClick={() => handleDeleteRevenue(r.id)}>
                                    <svg className="icon-delete" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state"><p>Belum ada catatan pendapatan.</p></div>
            )}
          </section>
        )}
      </main>

      {/* --- MODALS --- */}
      <Modal isOpen={isReceivableModalOpen} onClose={() => setReceivableModalOpen(false)}>
        <form onSubmit={handleAddReceivable}>
          <h3>Tambah Piutang Baru</h3>
          <div className="form-group">
            <label htmlFor="r-description">Keterangan</label>
            <input id="r-description" name="description" type="text" required />
          </div>
          <div className="form-group">
            <label htmlFor="r-totalAmount">Total Piutang (IDR)</label>
            <input id="r-totalAmount" name="totalAmount" type="number" min="0" required />
          </div>
          <div className="form-group">
            <label htmlFor="r-dueDate">Tanggal Jatuh Tempo</label>
            <input id="r-dueDate" name="dueDate" type="date" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setReceivableModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRevenueModalOpen} onClose={() => setRevenueModalOpen(false)}>
        <form onSubmit={handleAddRevenue}>
          <h3>Tambah Pendapatan Baru</h3>
          <div className="form-group">
            <label htmlFor="rev-description">Keterangan</label>
            <input id="rev-description" name="description" type="text" required />
          </div>
          <div className="form-group">
            <label htmlFor="rev-amount">Jumlah (IDR)</label>
            <input id="rev-amount" name="amount" type="number" min="0" required />
          </div>
          <div className="form-group">
            <label htmlFor="rev-date">Tanggal</label>
            <input id="rev-date" name="date" type="date" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setRevenueModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => {setPaymentModalOpen(false); setCurrentReceivable(null);}}>
        <form onSubmit={handleRecordPayment}>
          <h3>Catat Pembayaran</h3>
          <p>Sisa Piutang: <strong>{formatCurrency(currentReceivable?.totalAmount! - currentReceivable?.paidAmount!)}</strong></p>
          <div className="form-group">
            <label htmlFor="p-paymentAmount">Jumlah Pembayaran (IDR)</label>
            <input id="p-paymentAmount" name="paymentAmount" type="number" min="0" max={currentReceivable?.totalAmount! - currentReceivable?.paidAmount!} autoFocus required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => {setPaymentModalOpen(false); setCurrentReceivable(null);}}>Batal</button>
            <button type="submit" className="btn btn-primary">Bayar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingItem} onClose={handleCloseEditModal}>
        {editingItem?.type === 'receivable' && (
          <form onSubmit={handleUpdateItem}>
            <h3>Edit Piutang</h3>
            <div className="form-group">
                <label htmlFor="e-r-description">Keterangan</label>
                <input id="e-r-description" name="description" type="text" defaultValue={(editingItem.data as Receivable).description} required />
            </div>
            <div className="form-group">
                <label htmlFor="e-r-totalAmount">Total Piutang (IDR)</label>
                <input id="e-r-totalAmount" name="totalAmount" type="number" min="0" defaultValue={(editingItem.data as Receivable).totalAmount} required />
            </div>
            <div className="form-group">
                <label htmlFor="e-r-dueDate">Tanggal Jatuh Tempo</label>
                <input id="e-r-dueDate" name="dueDate" type="date" defaultValue={(editingItem.data as Receivable).dueDate} required />
            </div>
            <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseEditModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Update</button>
            </div>
          </form>
        )}
        {editingItem?.type === 'revenue' && (
          <form onSubmit={handleUpdateItem}>
            <h3>Edit Pendapatan</h3>
            <div className="form-group">
                <label htmlFor="e-rev-description">Keterangan</label>
                <input id="e-rev-description" name="description" type="text" defaultValue={(editingItem.data as Revenue).description} required />
            </div>
            <div className="form-group">
                <label htmlFor="e-rev-amount">Jumlah (IDR)</label>
                <input id="e-rev-amount" name="amount" type="number" min="0" defaultValue={(editingItem.data as Revenue).amount} required />
            </div>
            <div className="form-group">
                <label htmlFor="e-rev-date">Tanggal</label>
                <input id="e-rev-date" name="date" type="date" defaultValue={(editingItem.data as Revenue).date} required />
            </div>
            <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseEditModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Update</button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}