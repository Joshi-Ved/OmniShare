import os
import re

files = [
    'templates/admin/customers_gui.html',
    'templates/admin/sales_gui.html',
    'templates/admin/decision_gui.html',
    'templates/admin/moderation_gui.html',
    'templates/admin/crm_dashboard.html',
    'templates/admin/scm_dashboard.html',
]

reps = {
    'bg-slate-900': 'bg-slate-50 dark:bg-slate-900',
    'bg-[#0f111a]': 'bg-slate-50 dark:bg-[#0f111a]',
    'bg-[#0a0f18]': 'bg-slate-50 dark:bg-[#0a0f18]',
    'bg-[#0b0f19]': 'bg-slate-50 dark:bg-[#0b0f19]',
    'bg-indigo-950': 'bg-slate-50 dark:bg-indigo-950',
    'bg-[#0f1218]': 'bg-slate-50 dark:bg-[#0f1218]',
    'bg-slate-800': 'bg-white shadow dark:bg-slate-800 dark:shadow-none',
    'bg-[#12192a]': 'bg-white shadow dark:bg-[#12192a] dark:shadow-none',
    'bg-[#12192b]': 'bg-white shadow dark:bg-[#12192b] dark:shadow-none',
    'bg-[#151a2a]': 'bg-white shadow dark:bg-[#151a2a] dark:shadow-none',
    'bg-[#1a1d2d]': 'bg-white shadow dark:bg-[#1a1d2d] dark:shadow-none',
    'bg-indigo-900/50': 'bg-white shadow dark:bg-indigo-900/50 dark:shadow-none',
    'bg-[#151822]': 'bg-white shadow dark:bg-[#151822] dark:shadow-none',
    'text-white': 'text-slate-900 dark:text-white',
    'text-slate-100': 'text-slate-800 dark:text-slate-100',
    'text-slate-200': 'text-slate-800 dark:text-slate-200',
    'text-slate-300': 'text-slate-700 dark:text-slate-300',
    'text-slate-400': 'text-slate-600 dark:text-slate-400',
    'border-slate-700': 'border-slate-300 dark:border-slate-700',
    'border-slate-800': 'border-slate-300 dark:border-slate-800',
    'border-slate-700/50': 'border-slate-300 dark:border-slate-700/50',
    'border-indigo-800': 'border-indigo-200 dark:border-indigo-800',
    'border-indigo-800/50': 'border-indigo-200 dark:border-indigo-800/50',
    'border-emerald-900/50': 'border-emerald-200 dark:border-emerald-900/50',
    'border-cyan-900/50': 'border-cyan-200 dark:border-cyan-900/50',
    'border-rose-900/50': 'border-rose-200 dark:border-rose-900/50',
    'bg-slate-900/50': 'bg-slate-100 dark:bg-slate-900/50',
    'bg-[#11141c]': 'bg-slate-100 dark:bg-[#11141c]',
    'bg-[#0d121f]': 'bg-slate-100 dark:bg-[#0d121f]',
    'bg-[#161825]': 'bg-slate-100 dark:bg-[#161825]',
    'bg-[#11131d]': 'bg-slate-200 dark:bg-[#11131d]',
    'bg-indigo-900/80': 'bg-indigo-50 dark:bg-indigo-900/80',
    'bg-[#151c2e]': 'bg-slate-100 dark:bg-[#151c2e]',
    'bg-indigo-950/50': 'bg-white dark:bg-indigo-950/50',
    'bg-[#1c202e]': 'bg-slate-100 shadow-sm dark:bg-[#1c202e] dark:shadow-none',
    'bg-[#181116]': 'bg-red-50 dark:bg-[#181116]',
    'bg-[#160d12]': 'bg-red-100 dark:bg-[#160d12]',
    'bg-[#21151a]': 'bg-red-50 dark:bg-[#21151a]',
    'bg-rose-950/30': 'bg-rose-100 dark:bg-rose-950/30',
    'bg-indigo-900': 'bg-indigo-100 dark:bg-indigo-900',
    'bg-slate-800/80': 'bg-slate-100 dark:bg-slate-800/80',
    'hover:bg-[#1f2336]': 'hover:bg-slate-100 dark:hover:bg-[#1f2336]',
    'hover:bg-[#1a233b]': 'hover:bg-slate-100 dark:hover:bg-[#1a233b]',
    'text-blue-400': 'text-blue-600 dark:text-blue-400',
    'text-indigo-400': 'text-indigo-600 dark:text-indigo-400',
    'text-purple-400': 'text-purple-600 dark:text-purple-400',
    'text-pink-400': 'text-pink-600 dark:text-pink-400',
    'text-emerald-400': 'text-emerald-600 dark:text-emerald-400',
    'text-amber-400': 'text-amber-600 dark:text-amber-400',
    'text-rose-400': 'text-rose-600 dark:text-rose-400',
    'hover:bg-slate-700': 'hover:bg-slate-200 dark:hover:bg-slate-700',
    'hover:bg-indigo-800': 'hover:bg-indigo-200 dark:hover:bg-indigo-800',
    'hover:bg-rose-900/40': 'hover:bg-rose-200 dark:hover:bg-rose-900/40',
    'hover:bg-[#23273b]': 'hover:bg-slate-200 dark:hover:bg-[#23273b]',
}

for fpath in files:
    if not os.path.exists(fpath): continue
    with open(fpath, 'r', encoding='utf-8') as f: content = f.read()
    
    if "tailwind.config" not in content:
        content = content.replace("</style>", "</style>\n<script>\n  tailwind.config = { darkMode: ['class', '[data-theme=\"dark\"]'] }\n</script>")
    
    content = content.replace("padding:0!important}", "padding:0!important; background: transparent !important; color: inherit;}")
    
    for old, new in reps.items():
        if new not in content:
            content = re.sub(rf'(?<!dark:){re.escape(old)}', new, content)
            
    with open(fpath, 'w', encoding='utf-8') as f: f.write(content)

print('SUCCESS')
