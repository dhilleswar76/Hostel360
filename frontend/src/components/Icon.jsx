import React from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BedDouble, Bell, Building2, CalendarDays, CalendarClock,
  ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleDollarSign,
  ClipboardCheck, ClipboardList, ContactRound, DoorOpen, Download, Eye, EyeOff, FileText, Filter,
  GraduationCap, House, IndianRupee, LayoutDashboard, LogOut, MapPin, Menu, MessageSquareWarning,
  MoreHorizontal, MoveRight, PanelLeftClose, PanelLeftOpen, Plus, QrCode, Route, Search, Settings2,
  ShieldCheck, Siren, UsersRound, UserCheck, UserRound, WalletCards, Wrench, X, Utensils,
  MessageSquare, Star, Printer, RefreshCw, AlertTriangle, Clock, KeyRound, Shield, CheckCircle
} from "lucide-react";

const iconMap = {
  Activity, ArrowDownRight, ArrowUpRight, BedDouble, Bell, Building2, CalendarDays, CalendarClock,
  ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleDollarSign,
  ClipboardCheck, ClipboardList, ContactRound, DoorOpen, Download, Eye, EyeOff, FileText, Filter,
  GraduationCap, House, IndianRupee, LayoutDashboard, LogOut, MapPin, Menu, MessageSquareWarning,
  MoreHorizontal, MoveRight, PanelLeftClose, PanelLeftOpen, Plus, QrCode, Route, Search, Settings2,
  ShieldCheck, Siren, UsersRound, UserCheck, UserRound, WalletCards, Wrench, X, Utensils,
  MessageSquare, Star, Printer, RefreshCw, AlertTriangle, Clock, KeyRound, Shield, CheckCircle
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className }) {
  const Component = iconMap[name] || Activity;
  return <Component size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}

