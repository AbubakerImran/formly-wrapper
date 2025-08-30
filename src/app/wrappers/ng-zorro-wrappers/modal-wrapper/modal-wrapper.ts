import { Component } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormlyValidationMessage } from '@ngx-formly/core';
import { isObservable, of } from 'rxjs';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzFormItemComponent, NzFormModule } from 'ng-zorro-antd/form';
import { NzColDirective } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule, NzOptionComponent } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component({
  selector: 'formly-horizontal-wrapper',
  templateUrl: 'modal-wrapper.html',
  standalone: true,
  imports: [NgIf, FormlyValidationMessage, CommonModule, FormsModule, ReactiveFormsModule, NzInputModule, NzSelectModule, NzOptionComponent, NzRadioModule, NzFormItemComponent, NzColDirective, NzFormModule, NzCheckboxModule],
})
export class NgFormlyModalWrapper extends FieldWrapper {
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