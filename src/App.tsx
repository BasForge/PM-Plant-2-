import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MachinePage } from './components/MachinePage';
import { PMPlanPage } from './components/PMPlanPage';
import { SchedulePage } from './components/SchedulePage';
import { RepairPage } from './components/RepairPage';
import { ImprovementPage } from './components/ImprovementPage';
import { DashboardPage } from './components/DashboardPage';
import { DispatchPage } from './components/DispatchPage';
import { SetupPage } from './components/SetupPage';
import { PresentationPage } from './components/PresentationPage';
import { SettingsModal } from './components/SettingsModal';
import { InventoryPage } from './components/InventoryPage';
import { PMHistoryPage } from './components/PMHistoryPage';
import { TechnicianPortfolioPage } from './components/TechnicianPortfolioPage';
import { CostDown5Page } from './components/CostDown5Page';
import { PMOverdueAlertModal } from './components/PMOverdueAlertModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { getOverdueAndRescheduledSummary, getTodayDateString } from './utils/pmAlerts';

import { 
  Wrench, Activity, CalendarDays, ClipboardList, PenTool, 
  BarChart3, Settings, Menu, ChevronLeft, ChevronRight, Clock, ShieldCheck, Send, Presentation, Users,
  Sun, Moon, Package, ClipboardCheck, WifiOff, Award, Sparkles, TrendingDown, AlertTriangle, Bell, Cloud,
  LogOut, Shield, UserCheck, Eye
} from 'lucide-react';

function AppContent() {
  const { 
    currentUser, logout, isAdmin, canEdit, canDelete,
    schedules, firebaseStatus, lastFirebaseSync, syncWithFirebaseNow 
  } = useApp();
  
  // If not logged in, show login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Sidebar navigation active page state [1 to 6]
  const [activePage, setActivePage] = useState<number>(3); // Default to Page 3 (📅 ตารางงานช่าง) as requested as master planner
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true); // Collapsible fixed 220px
  const [showOverdueModal, setShowOverdueModal] = useState<boolean>(false);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  const todayStr = getTodayDateString();
  const { totalOverdueCount, totalRescheduledCount } = getOverdueAndRescheduledSummary(schedules, todayStr);

  // Dark/Light theme state

  // Dark/Light theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('isDarkMode', String(isDarkMode));
    const root = document.getElementById('app-main-root');
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
      if (root) root.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      if (root) root.classList.add('light-theme');
    }
  }, [isDarkMode]);

  // Settings global Dialog modal open status
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Dynamic live clock for Thailand local context
  const [liveTime, setLiveTime] = useState<string>('21:46:56');
  const [liveDate, setLiveDate] = useState<string>('พุธที่ 10 มิถุนายน 2569');

  useEffect(() => {
    // Dynamic countdown timer representing active clock ticking
    const interval = setInterval(() => {
      const now = new Date();
      // Adjust into Thailand timezone UTC+7
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const thTime = new Date(utc + (3600000 * 7));
      
      const hr = String(thTime.getHours()).padStart(2, '0');
      const min = String(thTime.getMinutes()).padStart(2, '0');
      const sec = String(thTime.getSeconds()).padStart(2, '0');
      
      const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์"];
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      
      setLiveTime(`${hr}:${min}:${sec}`);
      setLiveDate(`${days[thTime.getDay()]}ที่ ${thTime.getDate()} ${months[thTime.getMonth()]} ${thTime.getFullYear() + 543}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Map pages based on navigation index
  const renderActivePage = () => {
    switch (activePage) {
      case 1: return <MachinePage />;
      case 2: return <PMPlanPage />;
      case 3: return <SchedulePage />;
      case 4: return <RepairPage />;
      case 11: return <PMHistoryPage />;
      case 5: return <ImprovementPage />;
      case 13: return <CostDown5Page />;
      case 8: return <SetupPage />;
      case 7: return <DispatchPage />;
      case 10: return <InventoryPage />;
      case 6: return <DashboardPage />;
      case 9: return <PresentationPage />;
      case 12: return <TechnicianPortfolioPage />;
      default: return <SchedulePage />;
    }
  };

  // List of sidebar navigation buttons
  const navigationItems = [
    { id: 3, label: "📅 ตารางงานช่าง", icon: CalendarDays, desc: "มาสเตอร์พิกัดกะ" },
    { id: 1, label: "🏭 เครื่องจักร", icon: Activity, desc: "ทะเบียนระบบ/สถานะ" },
    { id: 2, label: "⏱ แผน PM", icon: ClipboardList, desc: "ความถี่อิ่มกาก/กระบวน" },
    { id: 4, label: "🔧 งานบันทึกประวัติซ่อม", icon: Wrench, desc: "วิเคราะห์ Why-Why" },
    { id: 11, label: "📋 งานบันทึกประวัติ PM", icon: ClipboardCheck, desc: "เทียบเวลามาตรฐาน/จริง" },
    { id: 5, label: "🔨 งานพัฒนา Kaizen", icon: PenTool, desc: "บอร์ดสเตตัสงาน" },
    { id: 13, label: "💰 Cost Down 5 (CD5)", icon: TrendingDown, desc: "ยืดอายุอะไหล่/สั่งทำเอง" },
    { id: 8, label: "⏱ งาน Setup เครื่อง", icon: Clock, desc: "เตรียมเครื่องก่อนและระหว่างวัน" },
    { id: 7, label: "📋 ระบบจ่ายงาน", icon: Send, desc: "ศูนย์ควบคุมสั่งจ่ายงาน" },
    { id: 10, label: "📦 คลังอะไหล่สำรอง", icon: Package, desc: "ควบคุมความปลอดภัยสต็อก" },
    { id: 6, label: "📊 ระบบสถิติ", icon: BarChart3, desc: "Dashboard/MTTR" },
    { id: 9, label: "📈 สรุปนำเสนอ", icon: Presentation, desc: "บอร์ดนำเสนอผู้บริหาร" },
    { id: 12, label: "🏆 Portfolio ช่าง", icon: Award, desc: "ประวัติผลงาน Kaizen & ปรับปรุง" }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a] text-slate-100 font-sans" id="app-main-root">
      
      {/* 1. LEFT COLLAPSIBLE FIXED SIDEBAR (Standard width: 220px) */}
      <div 
        id="app-sidebar-fixed"
        className={`bg-[#0b1222] border-r border-slate-800 flex flex-col justify-between shrink-0 h-full transition-all duration-300 relative z-40 select-none ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div>
          {/* Logo Brand portion */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2.5">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                  <Wrench size={18} className="animate-pulse" />
                </div>
                <div>
                  <h1 className="text-[13px] font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase">
                    Thai Food Maint
                  </h1>
                  <p className="text-[9px] text-slate-500 font-medium">ระบบบำรุงโรงงานอาหาร</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto p-1 text-cyan-400">
                <Wrench size={18} />
              </div>
            )}

            {/* Sidebar collapse button indicator */}
            {sidebarOpen && (
              <button
                id="btn-close-sidebar"
                onClick={() => setSidebarOpen(false)}
                className="hidden lg:block text-slate-500 hover:text-slate-350 hover:bg-slate-900 p-1 rounded-md transition"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* Navigation Items buttons */}
          <nav className="p-3 space-y-1 mt-4" id="app-sidebar-nav">
            {navigationItems.map((item) => {
              const IconComp = item.icon;
              const isSelected = activePage === item.id;
              const hasOverdueBadge = (item.id === 11 || item.id === 3) && totalOverdueCount > 0;
              
              return (
                <button
                  key={item.id}
                  id={`nav-item-btn-${item.id}`}
                  onClick={() => setActivePage(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between rounded-xl p-2.5 transition-all text-xs font-semibold ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center">
                    <IconComp size={16} className={`${isSelected ? 'text-slate-950' : 'text-slate-400'} shrink-0`} />
                    
                    {sidebarOpen && (
                      <div className="ml-3 text-left">
                        <p className="leading-none text-xs">{item.label}</p>
                        <p className={`text-[9px] mt-0.5 leading-none ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{item.desc}</p>
                      </div>
                    )}
                  </div>

                  {/* Overdue badge indicator */}
                  {hasOverdueBadge && (
                    <span 
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                        isSelected 
                          ? 'bg-slate-950 text-rose-400' 
                          : 'bg-rose-500 text-slate-950 animate-pulse'
                      }`}
                      title={`${totalOverdueCount} งาน PM เลยกำหนด`}
                    >
                      {totalOverdueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-slate-800/80 shrink-0">
          {sidebarOpen ? (
            <div className="text-[10px] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>โรงงานอาหารผ่านการรับรอง GMP</span>
              </div>
              <p className="text-slate-600 font-mono text-[9px] mt-1">v.1.1.0 (Offline Mode)</p>
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="mx-auto block text-slate-500 hover:text-cyan-400 transition"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. BODY CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative" id="app-body-container">
        
        {/* Dynamic header display clock bar */}
        <header className="bg-[#0b1222]/80 backdrop-blur-sm border-b border-slate-800 p-4 shrink-0 flex justify-between items-center z-30 select-none">
          
          {/* Collapse sidebar toggle in mobile/header */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                id="btn-open-sidebar"
                onClick={() => setSidebarOpen(true)}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-900 rounded-md transition"
              >
                <Menu size={18} />
              </button>
            )}
            
            {/* Active page simple breadcrumb */}
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
              {navigationItems.find(n => n.id === activePage)?.label} / พื้นที่สถิติและการทำงานหลัก
            </h2>
          </div>

          {/* Clock ticking timer panel */}
          <div className="flex items-center gap-4">
            
            {/* Thailand Time clock helper */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.2 rounded-lg text-right">
              <Clock className="text-cyan-400 animate-pulse" size={13} />
              <div>
                <p className="text-[8px] text-slate-500 uppercase leading-none">TH TIME</p>
                <p className="text-xs font-mono font-black text-cyan-400 leading-none mt-1">{liveTime}</p>
              </div>
            </div>

            {/* Date badge */}
            <div className="text-right hidden md:block">
              <p className="text-[8px] text-slate-500 leading-none uppercase font-bold text-right">CALENDAR DATE</p>
              <p className="text-[10px] text-slate-350 leading-none mt-1">{liveDate}</p>
            </div>

            {/* Cloud Firestore Live Status & Sync Button */}
            <button
              id="btn-cloud-firestore-sync"
              onClick={async () => {
                await syncWithFirebaseNow();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-md ${
                firebaseStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/50'
                  : firebaseStatus === 'syncing'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
              title={`Cloud Firestore: ${
                firebaseStatus === 'connected'
                  ? `เชื่อมต่อเรียลไทม์แล้ว (${lastFirebaseSync ? `ซิงค์ล่าสุด ${lastFirebaseSync}` : 'ออนไลน์'})`
                  : firebaseStatus === 'syncing'
                  ? 'กำลังซิงค์ข้อมูลกับ Cloud Firestore...'
                  : 'ออฟไลน์ / ใช้ฐานข้อมูลเครื่องนี้'
              } (คลิกเพื่อซิงค์ข้อมูลกับคลาวด์ทันที)`}
            >
              <span className="relative flex h-2 w-2">
                {firebaseStatus === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  firebaseStatus === 'connected' ? 'bg-emerald-500' :
                  firebaseStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                }`}></span>
              </span>
              <Cloud size={14} className={firebaseStatus === 'syncing' ? 'animate-spin text-amber-400' : ''} />
              <span className="font-semibold text-[11px] hidden sm:inline">
                {firebaseStatus === 'connected' ? 'Cloud Live' : firebaseStatus === 'syncing' ? 'ซิงค์...' : 'Offline'}
              </span>
            </button>

            {/* Overdue PM Alert Trigger Button */}
            <button
              id="btn-trigger-overdue-pm-modal"
              onClick={() => setShowOverdueModal(true)}
              className={`relative p-2 rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                totalOverdueCount > 0
                  ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500'
                  : 'bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-cyan-400'
              }`}
              title={
                totalOverdueCount > 0
                  ? `ตรวจพบ ${totalOverdueCount} งาน PM เลยกำหนด (คลิกเพื่อตรวจเช็ค/เลื่อนแผน)`
                  : 'ศูนย์ตรวจเช็คและแจ้งเตือนงาน PM เลยกำหนด / เลื่อนแผน'
              }
            >
              <Bell size={16} className={totalOverdueCount > 0 ? 'text-rose-400 animate-bounce' : ''} />
              {totalOverdueCount > 0 && (
                <span className="text-[10px] font-mono font-black text-rose-400">
                  {totalOverdueCount} งานเลยกำหนด
                </span>
              )}
            </button>

            {/* Toggle Dark/Light Mode button */}
            <button
              id="btn-toggle-theme"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-850 p-2 rounded-lg text-slate-350 hover:text-cyan-400 transition-all cursor-pointer shadow-md flex items-center justify-center"
              title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"}
            >
              {isDarkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-indigo-400" />}
            </button>

            {/* Gear trigger to open settings modal */}
            <button
              id="btn-trigger-settings-modal"
              onClick={() => setShowSettings(true)}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-850 p-2 rounded-lg text-slate-350 hover:text-cyan-400 transition-all cursor-pointer shadow-md"
              title="ตั้งค่าระบบและกะช่าง"
            >
              <Settings size={16} />
            </button>

            {/* Current User Profile & Role Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div 
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition"
                onClick={() => {
                  if (isAdmin) setShowUserModal(true);
                }}
                title={isAdmin ? "คลิกเพื่อจัดการบัญชีผู้ใช้งาน" : `ผู้ใช้งาน: ${currentUser.name}`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  currentUser.role === 'admin' ? 'bg-amber-400' :
                  currentUser.role === 'technician' ? 'bg-cyan-400' : 'bg-emerald-400'
                }`} />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 max-w-[120px] truncate">{currentUser.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      currentUser.role === 'technician' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'technician' ? 'ช่าง' : 'ผู้ดู'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 flex items-center gap-1">
                    <span>@{currentUser.username}</span>
                    <span>•</span>
                    <span>{canDelete ? 'สิทธิ์เต็ม (ลบได้)' : canEdit ? 'แก้ไขได้ (ห้ามลบ)' : 'ดูอย่างเดียว'}</span>
                  </div>
                </div>
              </div>

              {/* Admin quick user management button */}
              {isAdmin && (
                <button
                  id="btn-open-user-management"
                  onClick={() => setShowUserModal(true)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded-lg transition-all shadow-md flex items-center gap-1.5 text-xs"
                  title="จัดการผู้ใช้: เพิ่ม ลบ แก้ไข username/password และสิทธิ์"
                >
                  <Users size={15} className="text-cyan-400" />
                  <span className="hidden xl:inline text-[11px] font-semibold">จัดการผู้ใช้</span>
                </button>
              )}

              {/* Logout button */}
              <button
                id="btn-logout"
                onClick={logout}
                className="p-2 bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 rounded-lg transition-all shadow-md flex items-center gap-1 text-xs"
                title="ออกจากระบบ (Log Out)"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline text-[11px]">ออก</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable page canvas body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0f172a] relative min-h-0" id="app-canvas-container">
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {renderActivePage()}
          </div>
        </main>

        {/* Floating background grids styling */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.01),transparent_40%)] pointer-events-none select-none z-0"></div>
      </div>

      {/* 3. SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* 4. OVERDUE PM ALERT & RESCHEDULE HUB MODAL */}
      {showOverdueModal && (
        <PMOverdueAlertModal 
          onClose={() => setShowOverdueModal(false)}
          onNavigateToPMHistory={() => {
            setActivePage(11);
            setShowOverdueModal(false);
          }}
          onNavigateToSchedule={() => {
            setActivePage(3);
            setShowOverdueModal(false);
          }}
        />
      )}

      {/* 5. USER MANAGEMENT MODAL */}
      {showUserModal && (
        <UserManagementModal 
          isOpen={showUserModal} 
          onClose={() => setShowUserModal(false)} 
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
