import { Component, HostListener } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CdkDrag } from "@angular/cdk/drag-drop";

@Component({
  selector: 'formly-horizontal-wrapper',
  templateUrl: 'horizontal-wrapper.html',
  styleUrls: ['../../app.component.css'], // Ensure the correct path
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, ReactiveFormsModule, CdkDrag],
})
export class FormlyHorizontalWrapper extends FieldWrapper {
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
}
