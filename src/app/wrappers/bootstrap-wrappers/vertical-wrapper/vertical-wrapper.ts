import { Component, HostListener } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'formly-horizontal-wrapper',
  templateUrl: 'vertical-wrapper.html',
  styleUrl: '../../../styles/app.component.css', // Ensure the correct path
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, ReactiveFormsModule],
})
export class BootstrapVerticalWrapper extends FieldWrapper {
  menuVisible = false;
  menuPosition = { x: 0, y: 0 };

  get options$() {
    const opts = this.to?.options;
    if (Array.isArray(opts)) {
      return of(opts);
    } else if (isObservable(opts)) {
      return opts;
    }
    return of([]);
  }

  override get formControl(): FormControl {
    return super.formControl as FormControl;
  }

  showContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.menuVisible = true;
  }

  onMenuClick(action: 'openEditFieldModal' | 'deleteField') {
    if (action === 'openEditFieldModal' && typeof this.to['openEditFieldModal'] === 'function') {
      this.to['openEditFieldModal'](this.field);
    } else if (action === 'deleteField' && typeof this.to['deleteField'] === 'function') {
      this.to['deleteField']();
    }
    this.menuVisible = false;
  }

  @HostListener('document:click')
  hideMenu() {
    this.menuVisible = false;
  }

  onDragStart() {
    // set body cursor immediately (beats CSS scope issues)
    document.body.style.cursor = 'grabbing';

    // sometimes the preview element appears a tick later — set it too
    setTimeout(() => {
      const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
      if (preview) preview.style.cursor = 'grabbing';
      const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
      overlays.forEach(o => (o as HTMLElement).style.cursor = 'grabbing');
    }, 0);
  }

  onDragEnd() {
    // reset
    document.body.style.cursor = '';
    const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (preview) preview.style.cursor = '';
    const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
    overlays.forEach(o => (o as HTMLElement).style.cursor = '');
  }
}
