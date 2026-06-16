import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 w-80">
      @for (toast of toasts(); track toast.id) {
        <div class="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
             [class]="toastClass(toast.type)">
          <span class="text-lg leading-none">{{ toastIcon(toast.type) }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.dismiss(toast.id)"
                  class="opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);

  toasts(): Toast[] {
    return this.toastService.toasts();
  }

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-900 border-emerald-600 text-emerald-100',
      error:   'bg-red-900 border-red-600 text-red-100',
      info:    'bg-indigo-900 border-indigo-600 text-indigo-100'
    };
    return map[type] ?? '';
  }

  toastIcon(type: string): string {
    const map: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };
    return map[type] ?? '';
  }
}
