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

  addFixedField(type: 'input' | 'textarea' | 'select' | 'radio') {
    // Count existing fields with same type prefix in key
    const existingCount = this.fields.filter(f => 
      typeof f.key === 'string' && f.key.startsWith(type)
    ).length;
    const index = existingCount + 1;

    const baseStyle = {
      width: '', height: '', maxWidth: '', minWidth: '', maxHeight: '', minHeight: '', display: '',
      margin: '', marginTop: '', marginRight: '', marginBottom: '', marginLeft: '',
      padding: '', paddingTop: '', paddingRight: '', paddingBottom: '', paddingLeft: '', boxSizing: '',
      border: '1px solid #ccc', borderWidth: '', borderTopWidth: '', borderRightWidth: '', borderBottomWidth: '', borderLeftWidth: '',
      borderStyle: '', borderTopStyle: '', borderRightStyle: '', borderBottomStyle: '', borderLeftStyle: '',
      borderColor: '', borderTopColor: '', borderRightColor: '', borderBottomColor: '', borderLeftColor: '',
      borderRadius: '', outline: '', outlineColor: '', outlineWidth: '', outlineStyle: '',
      color: '', backgroundColor: '', backgroundImage: '', backgroundSize: '', backgroundRepeat: '',
      backgroundPosition: '', backgroundClip: '', backgroundOrigin: '', backgroundAttachment: '',
      fontFamily: '', fontSize: '', fontWeight: '', fontStyle: '', fontVariant: '',
      textAlign: '', textTransform: '', textDecoration: '', letterSpacing: '', wordSpacing: '',
      lineHeight: '', whiteSpace: '', textOverflow: '',
      boxShadow: '', textShadow: '', cursor: '', pointerEvents: '', userSelect: '', caretColor: '',
      transition: '', transitionProperty: '', transitionDuration: '', transitionTimingFunction: '',
      transitionDelay: '', animation: '', animationName: '', animationDuration: '',
      animationTimingFunction: '', animationDelay: '', animationIterationCount: '',
      animationDirection: '', animationFillMode: '',
      opacity: '', visibility: '', overflow: '', overflowX: '', overflowY: '', clipPath: ''
    };

    let newField: FormlyFieldConfig = {
      key: `${type}${index}`,  // increment here
      type: type,
      wrappers: ["form-field-horizontal"],
      props: {
        label: `${type}${index}`,         // increment here
        id: `${type}${index}`,            // increment here
        placeholder: type === 'textarea' ? `Enter ${type}${index} text` : `${type}${index}`,  // increment here
        class: type === 'select' ? 'form-select mb-2' :
              type === 'radio' ? 'form-check-input mb-2' : 'form-control mb-2',
        required: false,
        labelClass: type === 'radio' ? 'form-check-label' : 'form-label',
        labelFor: `${type}${index}`,      // increment here
        style: baseStyle,
        pattern: ''
      },
      validation: { messages: { required: "This field is required" } }
    };

    // Special case: Select / Radio default options
    if (type === 'select' || type === 'radio') {
      newField.props = newField.props || {};
      newField.props.options = [
        { label: 'Option 1', value: 'Option 1' },
        { label: 'Option 2', value: 'Option 2' }
      ];
    }

    this.fields.push(newField);
    localStorage.setItem('formFields', JSON.stringify(this.fields));
    this.cancelFieldModal();
    this.ngOnInit();
  }

  type = signal('');

  getValue(user: any, key: any) {
    if (!key) return '';
    return user[key] ?? '';
  }

  editingFieldIndex: number | null = null;

  openEditFieldModal(index: number) {
  this.editingFieldIndex = index;
  const field = this.fields[index];
  const type = typeof field.type === 'string' ? field.type : 'input';
  this.type.set(type);

  this.modalStep.set('configure');

  const style = field.props?.['style'] || {};

  this.modalModel = {
    key: field.key,
    label: field.props?.label || '',
    id: field.props?.['id'] || '',
    class: field.props?.['class'] || '',
    placeholder: field.props?.placeholder || '',
    required: !!field.props?.required,
    options: Array.isArray(field.props?.options)
      ? field.props.options.map((o: any) => o.label).join(', ')
      : '',
    ...style
  };

  this.modalFields = [
    { key: 'key', type: 'input', props: { label: 'Key', required: true } },
    { key: 'id', type: 'input', props: { label: 'ID' } },
    { key: 'label', type: 'input', props: { label: 'Label', required: true } },
    { key: 'placeholder', type: 'input', props: { label: 'Placeholder' } },
    { key: 'required', type: 'checkbox', props: { label: 'Required' } },
    { key: 'class', type: 'input', props: { label: 'Class' } },
  ];

  if (type === 'select' || type === 'radio') {
    this.modalFields.push({ key: 'options', type: 'input', props: { label: 'Options (comma separated)', required: true } });
  }

  const styleKeys = Object.keys(this.fields[0]?.props?.['style'] || {});
  styleKeys.forEach(sk => {
    this.modalFields.push({
      key: sk,
      type: 'input',
      props: { label: `${sk}` }
    });
  });

  this.modalForm = this.fb.group({});
}

  saveFieldEdit() {
  if (this.editingFieldIndex === null) return;

  if (this.modalForm.invalid) {
    this.modalForm.markAllAsTouched();
    return;
  }

  const updatedStyle: any = {};
  const styleKeys = Object.keys(this.fields[0]?.props?.['style'] || {});
  styleKeys.forEach(sk => {
    updatedStyle[sk] = this.modalModel[sk] || '';
  });

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
        : undefined,
      style: updatedStyle
    }
  };

  this.fields[this.editingFieldIndex] = updatedField;
  localStorage.setItem('formFields', JSON.stringify(this.fields));

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

  showSideDiv = false;

  onEditFieldsClick() {
    this.showSideDiv = true;
    this.modalStep.set('select');
  }

  closeSideDiv() {
    this.showSideDiv = false;
    this.modalStep.set('select');
  }

  backSideDiv() {
    this.modalStep.set('select');
  }
}