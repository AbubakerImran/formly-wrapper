import { Component } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'formly-horizontal-wrapper',
  templateUrl: 'horizontal-wrapper.html',
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, ReactiveFormsModule],
})
export class FormlyHorizontalWrapper extends FieldWrapper {

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