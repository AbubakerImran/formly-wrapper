import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FieldWrapper, FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';

@Component({
  selector: 'formly-field-custom-input',
  templateUrl: 'modal-wrapper.html',
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, ReactiveFormsModule],
})
export class ModalWrapper extends FieldWrapper {

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
