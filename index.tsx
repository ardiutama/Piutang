import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabaseClient';
import { Session, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// --- TYPE DEFINITIONS ---
interface Receivable {
  id: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
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
  // Using new Date() with a 'YYYY-MM-DD' string creates a date at UTC midnight.
  // By specifying timeZone: 'UTC' in the formatter, we prevent the date from shifting
  // due to the user's local timezone.
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
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

// --- AUTH COMPONENT ---
const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // No alert needed, auth state change will handle UI
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
            }
        } catch (error: any) {
            alert(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="auth-container">
            <div className="auth-form">
                <h1>{isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}</h1>
                <p style={{textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-light-color)'}}>
                    {isLogin ? 'Masuk untuk melanjutkan' : 'Daftar untuk mulai mengelola keuangan Anda'}
                </p>
                <form onSubmit={handleAuth}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Memproses...' : (isLogin ? 'Login' : 'Daftar')}
                    </button>
                </form>
                 <div className="auth-actions">
                    <button onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- DASHBOARD COMPONENT ---
const Dashboard: React.FC<{ session: Session }> = ({ session }) => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('receivables');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  
  const [isReceivableModalOpen, setReceivableModalOpen] = useState(false);
  const [isRevenueModalOpen, setRevenueModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const [currentReceivable, setCurrentReceivable] = useState<Receivable | null>(null);
  
  // --- DATA FETCHING & REAL-TIME ---
  useEffect(() => {
    const fetchInitialData = async () => {
        const { data: receivablesData, error: receivablesError } = await supabase
            .from('receivables')
            .select('*')
            .order('due_date', { ascending: true });
        
        if (receivablesError) console.error('Error fetching receivables:', receivablesError);
        else setReceivables(receivablesData as Receivable[]);

        const { data: revenuesData, error: revenuesError } = await supabase
            .from('revenues')
            .select('*')
            .order('date', { ascending: false });

        if (revenuesError) console.error('Error fetching revenues:', revenuesError);
        else setRevenues(revenuesData as Revenue[]);
    };

    fetchInitialData();
    
    const handleChanges = (payload: RealtimePostgresChangesPayload<{[key: string]: any}>) => {
        console.log("Real-time change received:", payload); // Diagnostic log

        const { eventType, new: newRecord, old: oldRecord, table } = payload;

        if (table === 'receivables') {
            setReceivables(current => {
                switch (eventType) {
                    case 'INSERT':
                        if (current.some(r => r.id === (newRecord as Receivable).id)) return current;
                        return [...current, newRecord as Receivable];
                    case 'UPDATE':
                        return current.map(r => r.id === newRecord.id ? newRecord as Receivable : r);
                    case 'DELETE':
                        return current.filter(r => r.id !== (oldRecord as { id: string }).id);
                    default:
                        return current;
                }
            });
        }

        if (table === 'revenues') {
             setRevenues(current => {
                switch (eventType) {
                    case 'INSERT':
                        if (current.some(r => r.id === (newRecord as Revenue).id)) return current;
                        return [...current, newRecord as Revenue];
                    case 'UPDATE':
                        return current.map(r => r.id === newRecord.id ? newRecord as Revenue : r);
                    case 'DELETE':
                        return current.filter(r => r.id !== (oldRecord as { id: string }).id);
                    default:
                        return current;
                }
            });
        }
    };
    
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivables' }, handleChanges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenues' }, handleChanges)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed!');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime channel error:`, err);
        }
         if (status === 'TIMED_OUT') {
          console.warn('Realtime channel subscription timed out.');
        }
    });

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);


  // --- HANDLER FUNCTIONS ---
  const handleAddReceivable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data, error } = await supabase.from('receivables').insert({
      description: formData.get('description') as string,
      total_amount: parseFloat(formData.get('totalAmount') as string),
      paid_amount: 0,
      due_date: formData.get('dueDate') as string,
      user_id: session.user.id
    }).select().single();

    if (error) {
        alert(error.message);
    } else if (data) {
        setReceivables(current => [...current, data as Receivable]);
        setReceivableModalOpen(false);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data, error } = await supabase.from('revenues').insert({
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        date: formData.get('date') as string,
        user_id: session.user.id
    }).select().single();

    if (error) {
        alert(error.message);
    } else if (data) {
        setRevenues(current => [...current, data as Revenue]);
        setRevenueModalOpen(false);
    }
  };
  
  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentReceivable) return;
    
    const formData = new FormData(e.currentTarget);
    const paymentAmount = parseFloat(formData.get('paymentAmount') as string);
    
    const { data, error } = await supabase
      .from('receivables')
      .update({ paid_amount: Math.min(currentReceivable.total_amount, currentReceivable.paid_amount + paymentAmount) })
      .eq('id', currentReceivable.id)
      .select()
      .single();
      
    if (error) {
        alert(error.message);
    } else if (data) {
        setReceivables(current => current.map(r => r.id === data.id ? data as Receivable : r));
        setPaymentModalOpen(false);
        setCurrentReceivable(null);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus piutang ini?')) {
      const { error } = await supabase.from('receivables').delete().eq('id', id);
      if (error) {
          alert(error.message);
      } else {
          setReceivables(current => current.filter(r => r.id !== id));
      }
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pendapatan ini?')) {
      const { error } = await supabase.from('revenues').delete().eq('id', id);
      if (error) {
          alert(error.message);
      } else {
          setRevenues(current => current.filter(r => r.id !== id));
      }
    }
  };

  const handleOpenEditModal = (item: Receivable | Revenue, type: 'receivable' | 'revenue') => {
    setEditingItem({ data: item, type });
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
  };
  
  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
  
    const formData = new FormData(e.currentTarget);
  
    if (editingItem.type === 'receivable') {
      const { data, error } = await supabase
        .from('receivables')
        .update({
            description: formData.get('description') as string,
            total_amount: parseFloat(formData.get('totalAmount') as string),
            due_date: formData.get('dueDate') as string,
        })
        .eq('id', editingItem.data.id)
        .select().single();

      if (error) {
          alert(error.message);
      } else if (data) {
          setReceivables(current => current.map(r => r.id === data.id ? data as Receivable : r));
      }
    } else { // 'revenue'
      const { data, error } = await supabase
        .from('revenues')
        .update({
            description: formData.get('description') as string,
            amount: parseFloat(formData.get('amount') as string),
            date: formData.get('date') as string,
        })
        .eq('id', editingItem.data.id)
        .select().single();

      if (error) {
          alert(error.message);
      } else if (data) {
          setRevenues(current => current.map(r => r.id === data.id ? data as Revenue : r));
      }
    }
    handleCloseEditModal();
  };

  // --- DERIVED STATE / MEMOS ---
  const sortedReceivables = useMemo(() => 
    [...receivables].sort((a, b) => {
      const remainingA = a.total_amount - a.paid_amount;
      const remainingB = b.total_amount - b.paid_amount;
      if (remainingA > 0 && remainingB <= 0) return -1;
      if (remainingA <= 0 && remainingB > 0) return 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }), [receivables]);

  const sortedRevenues = useMemo(() => 
    [...revenues].sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }), 
    [revenues]
  );

  const receivablesSummary = useMemo(() => {
    return receivables.reduce((acc, curr) => {
      acc.total += curr.total_amount;
      acc.remaining += (curr.total_amount - curr.paid_amount);
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
        <h1>PayLogix</h1>
        <div className="user-info">
            <span>{session.user.email}</span>
            <button className="btn logout-btn" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
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
                      const remaining = r.total_amount - r.paid_amount;
                      const isPaid = remaining <= 0;
                      return (
                        <tr key={r.id}>
                          <td>{index + 1}</td>
                          <td>{r.description}</td>
                          <td>{formatDate(r.due_date)}</td>
                          <td>{formatCurrency(r.total_amount)}</td>
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
          <p>Sisa Piutang: <strong>{formatCurrency(currentReceivable?.total_amount! - currentReceivable?.paid_amount!)}</strong></p>
          <div className="form-group">
            <label htmlFor="p-paymentAmount">Jumlah Pembayaran (IDR)</label>
            <input id="p-paymentAmount" name="paymentAmount" type="number" min="0" max={currentReceivable?.total_amount! - currentReceivable?.paid_amount!} autoFocus required />
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
                <input id="e-r-totalAmount" name="totalAmount" type="number" min="0" defaultValue={(editingItem.data as Receivable).total_amount} required />
            </div>
            <div className="form-group">
                <label htmlFor="e-r-dueDate">Tanggal Jatuh Tempo</label>
                <input id="e-r-dueDate" name="dueDate" type="date" defaultValue={(editingItem.data as Receivable).due_date} required />
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

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!session) {
        return <Auth />;
    } else {
        // We use a key here to force re-mounting the Dashboard when the user changes, ensuring data is fresh.
        return <Dashboard key={session.user.id} session={session} />;
    }
};


const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
