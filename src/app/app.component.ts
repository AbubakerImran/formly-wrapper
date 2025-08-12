import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { FormlySelectModule } from '@ngx-formly/core/select';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormlyForm, ReactiveFormsModule, HttpClientModule, CommonModule, FormlySelectModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class App implements OnInit {

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  // Main form
  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};
  fields: FormlyFieldConfig[] = [];
  users: any[] = [];

  uid = signal(0);
  isEdit = signal(false);
  editingId = signal(0);

  // Modal state
  modalStep = signal<'select' | 'configure'>('select');
  modalForm = new FormGroup({});
  modalModel: any = {};
  modalOptions: FormlyFormOptions = {};
  modalFields: FormlyFieldConfig[] = [];

  ngOnInit() {
    const storedFields = localStorage.getItem('formFields');
    if (storedFields) {
      this.fields = JSON.parse(storedFields);
    }
    this.fetchData();
  }

  step() {
    return this.modalStep();
  }

  fetchData() {
    const data = localStorage.getItem('data');
    if (data) {
      this.users = JSON.parse(data);
    } else {
      this.users = [];
    }
  }

  onSubmit(model: any) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    } else if (this.fields.length != 0) {
      const existingData = JSON.parse(localStorage.getItem('data') || '[]');
      const newEntry = { id: Date.now(), ...model };
      existingData.push(newEntry);
      localStorage.setItem('data', JSON.stringify(existingData));
      this.model = {};
      this.form.reset();
      this.fetchData();
      this.isEdit.set(false);
    }
  }

  update(model: any) {
    const existingData = JSON.parse(localStorage.getItem('data') || '[]');
    const updatedData = existingData.map((user: any) => {
      if (user.id === this.uid()) {
        return { id: this.uid(), ...model };
      }
      return user;
    });
    localStorage.setItem('data', JSON.stringify(updatedData));
    this.model = {};
    this.fetchData();
    this.isEdit.set(false);
  }

  deleteUser(id: any) {
    const existingData = JSON.parse(localStorage.getItem('data') || '[]');
    const updatedData = existingData.filter((user: any) => user.id !== id);
    localStorage.setItem('data', JSON.stringify(updatedData));
    this.fetchData();
  }

  editUser(id: number) {
    const existingData = JSON.parse(localStorage.getItem('data') || '[]');
    const userToEdit = existingData.find((user: any) => user.id === id);
    if (userToEdit) {
      this.model = { ...userToEdit };
    }
    this.uid.set(id);
    this.editingId.set(id);
    this.isEdit.set(true);
  }

  cancel() {
    this.isEdit.set(false);
    this.model = {};
    this.form.reset();
    this.fetchData();
  }

  cancelFieldModal() {
    // Reset modal state to show field list again
    this.modalStep.set('select');
    this.modalForm.reset();
    this.modalModel = {};
    this.modalFields = [];
    this.editingFieldIndex = null;
  }

  startAddField(type: string) {
    this.modalStep.set('configure'); // Switch to configure step
    this.modalForm = this.fb.group({});
    this.modalModel = {};
    // Map type to JSON file
    let filePath = '';
    switch (type) {
      case 'input':
        filePath = 'assets/fields/input.json';
        this.type.set('input');
        break;
      case 'textarea':
        filePath = 'assets/fields/textarea.json';
        this.type.set('textarea');
        break;
      case 'select':
        filePath = 'assets/fields/select.json';
        this.type.set('select');
        break;
      case 'radio':
        filePath = 'assets/fields/radio.json';
        this.type.set('radio');
        break;
      default:
        console.error('Unknown field type:', type);
        return;
    }
    // Load the JSON
    this.http.get<FormlyFieldConfig[]>(filePath).subscribe(config => {
      this.modalFields = config;
    });
  }

  type = signal('');

  submit() {
    if (this.modalForm.invalid) {
      this.modalForm.markAllAsTouched();
      return;
    }
    let newField: FormlyFieldConfig = {
      key: this.modalModel.key,
      type: 'input',
      wrappers: ["form-field-horizontal"],
      props: {
        label: this.modalModel.label,
        placeholder: this.modalModel.placeholder || '',
        class: "form-control mb-2",
        required: !!this.modalModel.required,
        labelClass: "form-label",
        labelFor: this.modalModel.key,
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    };
    // Select / Radio support
    if (this.type() === 'select') {
      newField.type = 'select'; // change if you detect radio type
      newField.props = {
        ...newField.props,
        class: "form-select mb-2",
        options: this.modalModel.options.split(',').map((opt: string) => ({
          label: opt.trim(),
          value: opt.trim()
        }))
      };
    } else if (this.type() === 'radio') {
      newField.type = 'radio'; // change if you detect radio type
      newField.props = {
        ...newField.props,
        class: "form-check-input mb-2",
        labelClass: 'form-check-label',
        options: this.modalModel.options.split(',').map((opt: string) => ({
          label: opt.trim(),
          value: opt.trim()
        }))
      };
    }
    // Add to fields array
    this.fields.push(newField);
    // Save updated fields to localStorage
    localStorage.setItem('formFields', JSON.stringify(this.fields));
    // Reset modal state
    this.cancelFieldModal();
    this.ngOnInit();
  }

  getValue(user: any, key: any) {
    if (!key) return '';
    return user[key] ?? '';
  }

  editingFieldIndex: number | null = null;

  // Opens edit modal and shows existing fields list first
  openEditFieldModal(index: number) {
    this.editingFieldIndex = index;
    const field = this.fields[index];
    const type = typeof field.type === 'string' ? field.type : 'input';
    this.type.set(type);

    this.modalStep.set('configure');

    this.modalModel = {
      key: field.key,
      label: field.props?.label || '',
      placeholder: field.props?.placeholder || '',
      required: !!field.props?.required,
      options: Array.isArray(field.props?.options)
        ? field.props.options.map((o: any) => o.label).join(', ')
        : ''
    };

    this.modalFields = [
      { key: 'key', type: 'input', props: { label: 'Key', required: true } },
      { key: 'label', type: 'input', props: { label: 'Label', required: true } },
      { key: 'placeholder', type: 'input', props: { label: 'Placeholder' } },
      { key: 'required', type: 'checkbox', props: { label: 'Required' } },
    ];

    if (type === 'select' || type === 'radio') {
      this.modalFields.push({ key: 'options', type: 'input', props: { label: 'Options (comma separated)', required: true } });
    }

    this.modalForm = this.fb.group({});
}

  saveFieldEdit() {
    if (this.editingFieldIndex === null) return;

    // Validate modal form
    if (this.modalForm.invalid) {
      this.modalForm.markAllAsTouched();
      return;
    }

    const updatedField: FormlyFieldConfig = {
      ...this.fields[this.editingFieldIndex],
      key: this.modalModel.key,
      props: {
        ...this.fields[this.editingFieldIndex].props,
        label: this.modalModel.label,
        placeholder: this.modalModel.placeholder,
        required: !!this.modalModel.required,
        options: this.modalModel.options
          ? this.modalModel.options.split(',').map((opt: string) => ({
              label: opt.trim(),
              value: opt.trim()
            }))
          : undefined
      }
    };

    // Update fields array with new field config
    this.fields[this.editingFieldIndex] = updatedField;

    // Save updated fields to localStorage
    localStorage.setItem('formFields', JSON.stringify(this.fields));

    // Reset modal state to list view
    this.modalStep.set('select');
    this.editingFieldIndex = null;
    this.modalForm.reset();
    this.modalModel = {};
    this.ngOnInit();
  }

  deleteField(index: number) {
    if (index >= 0 && index < this.fields.length) {
      this.fields.splice(index, 1);
      localStorage.setItem('formFields', JSON.stringify(this.fields));
      this.ngOnInit();
    }
  }

}
