import { Component, HostListener } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'formly-horizontal-wrapper',
  templateUrl: 'modal-wrapper.html',
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, ReactiveFormsModule, ],
})
export class FormlyModalWrapper extends FieldWrapper {
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
}