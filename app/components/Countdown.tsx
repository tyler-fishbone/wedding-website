"use client";
import { useEffect, useState } from "react";
export function Countdown({ target }: { target: string }) { const getDays = () => Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 86_400_000)); const [days, setDays] = useState(getDays); useEffect(() => { const timer = window.setInterval(() => setDays(getDays()), 3_600_000); return () => window.clearInterval(timer); }, [target]); return <p className="countdown"><strong>{days}</strong> days to go</p>; }
