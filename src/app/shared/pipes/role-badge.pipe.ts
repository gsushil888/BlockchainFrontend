import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'roleBadge', standalone: true })
export class RoleBadgePipe implements PipeTransform {
  transform(role: string): string {
    return role === 'ADMIN'
      ? 'bg-purple-50 text-purple-700 border border-purple-200'
      : 'bg-indigo-50 text-indigo-700 border border-indigo-200';
  }
}
