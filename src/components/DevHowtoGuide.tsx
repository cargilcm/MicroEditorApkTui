import React from 'react';
import { 
  Terminal, 
  BookOpen, 
  HelpCircle, 
  FolderCheck, 
  Share2, 
  ExternalLink,
  Smartphone,
  Cpu
} from 'lucide-react';

export default function DevHowtoGuide() {
  return (
    <div id="dev-howto-guide" className="bg-neutral-900 border-l border-neutral-800 h-full w-full overflow-y-auto p-4 select-text font-sans text-neutral-300 space-y-5">
      {/* Title */}
      <div className="border-b border-neutral-800 pb-3">
        <h2 className="text-sm font-bold tracking-wider font-mono text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" /> Real Android Setup Guide
        </h2>
        <p className="text-[10px] text-neutral-400">
          How to run Go's micro on your physical phone & pair it with SAF storage trees.
        </p>
      </div>

      <div className="space-y-4 text-xs leading-relaxed">
        {/* Step 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold font-mono text-white">
            <span className="bg-emerald-950 text-emerald-400 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-emerald-800/40 font-bold shrink-0">
              1
            </span>
            <span>Install Termux and Micro Code</span>
          </div>
          <p className="text-neutral-400 pl-6 text-[11px]">
            Download the official Termux app. Then install Go's <code className="bg-neutral-950 px-1 py-0.5 rounded text-yellow-400">micro</code> editor binary:
          </p>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 font-mono text-[10px] pl-6 text-green-400 space-y-1">
            <div>pkg update</div>
            <div>pkg install micro golang</div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold font-mono text-white">
            <span className="bg-emerald-950 text-emerald-400 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-emerald-800/40 font-bold shrink-0">
              2
            </span>
            <span>Mount Android SD Storage</span>
          </div>
          <p className="text-neutral-400 pl-6 text-[11px]">
            Grant Termux permission to traverse outer storage pools (SD Card, Downloads):
          </p>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 font-mono text-[10px] pl-6 text-green-400">
            <div>termux-setup-storage</div>
          </div>
          <p className="text-[10px] text-neutral-500 pl-6">
            This maps your internal SD card directories to <code className="text-neutral-400">~/storage/shared</code>.
          </p>
        </div>

        {/* Step 3 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold font-mono text-white">
            <span className="bg-emerald-950 text-emerald-400 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-emerald-800/40 font-bold shrink-0">
              3
            </span>
            <span>Enable SAF DocumentProvider</span>
          </div>
          <p className="text-neutral-400 pl-6 text-[11px]">
            Termux exposes its private <code className="text-neutral-200">/data/data/com.termux/files/</code> directory via an Android DocumentProvider.
          </p>
          <div className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800 text-[11px] font-sans pl-6 space-y-1 text-neutral-400">
            <p>
              1. Open your Android device system file selector.
            </p>
            <p>
              2. Click top-left side drawers & select "Termux".
            </p>
            <p>
              3. Approve target directory read/write mounts to enable direct links with external editors securely!
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="space-y-1.5 pb-2">
          <div className="flex items-center gap-1.5 font-bold font-mono text-white">
            <span className="bg-emerald-950 text-emerald-400 text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-emerald-800/40 font-bold shrink-0">
              4
            </span>
            <span>Configure Custom Colorschemes</span>
          </div>
          <p className="text-neutral-400 pl-6 text-[11px]">
            Create a custom `.micro` schema mapping inside home configs to personalize themes:
          </p>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 font-mono text-[10px] pl-6 text-green-400">
            <div>mkdir -p ~/.config/micro/colorschemes/</div>
            <div>micro ~/.config/micro/colorschemes/mytheme.micro</div>
          </div>
          <p className="text-[10px] text-neutral-500 pl-6">
            Inside the theme file, set standard bindings like <code className="text-neutral-400">color-link keyword "#FB4934"</code>.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-2">
          <div className="flex items-center gap-1 text-white font-bold text-[10px] uppercase font-mono">
            <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Simulation Mode Specs
          </div>
          <p className="leading-relaxed">
            This web sandbox mimics these system structures locally. Modifying or saving files commits updates directly inside virtual React registers, persisting file logs flawlessly between sessions!
          </p>
        </div>
      </div>
    </div>
  );
}
