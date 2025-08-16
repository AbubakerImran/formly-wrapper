import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';
import { FormlySelectModule } from '@ngx-formly/core/select';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormlyForm, ReactiveFormsModule, HttpClientModule, CommonModule, FormlySelectModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
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
  savedFormNames: string[] = [];

  editFormModal = new FormGroup({});
  editFormModel: any = {};
  editFormFields: FormlyFieldConfig[] = [
    {
      key: "formName",
      type: "input",
      wrappers: ["form-field-vertical"],
      props: {
        label: "Form Name",
        placeholder: "Enter form name",
        class: "form-control mb-2",
        labelClass: "form-label",
        id: "formName",
        required: true
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    },
    {
      key: "wrapper",
      type: "radio",
      wrappers: ["form-field-vertical"],
      defaultValue: () => {
        // Get saved wrapper for current form or default to horizontal
        return localStorage.getItem(`wrapper_${this.editFormModel.formName}`) || "form-field-horizontal";
      },
      props: {
        label: "Form Wrapper",
        class: "form-check-input",
        labelClass: "form-check-label",
        id: "wrapper",
        required: true,
        options: [
          { value: "form-field-horizontal", label: "Horizontal Wrapper" },
          { value: "form-field-vertical", label: "Vertical Wrapper" },
        ],
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    }
  ];

  displayFields: { key: string, label: string }[] = [];

  formHeading = '';
  editFormNameBefore = '';
  showForm = '';

  formChanged = false;

  openEditFormNameModal(name: string) {
    const savedWrapper = localStorage.getItem(`wrapper_${name}`) || 'form-field-horizontal';

    this.editFormModel = { 
      formName: name,
      wrapper: savedWrapper
    };

    // Update field config dynamically
    this.editFormFields = this.editFormFields.map(f => {
      if (f.key === 'wrapper') {
        return {
          ...f,
          defaultValue: savedWrapper
        };
      }
      return f;
    });

    this.editFormNameBefore = name; 
  }
  
  ngOnInit() {
    // Don't load any fields until a form is opened
    this.fields = [];
    this.model = {};
    this.users = [];
    this.fetchData(); 
    this.loadSavedFormNames();
  }

  loadSavedFormNames() {
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    this.savedFormNames = Object.keys(savedForms);
  }

  loadSavedForm(formName: string) {
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    if (savedForms[formName]) {
      this.showForm = formName;
      this.fields = savedForms[formName].map((f: any) => ({
        ...f,
        wrappers: [localStorage.getItem(`wrapper_${formName}`) || 'form-field-horizontal']
      }));
      this.reattachFieldFunctions();
      this.formHeading = formName;
      localStorage.setItem('formFields', JSON.stringify(this.fields));
      this.fetchData();
    }
  }

  createNewForm() {
    let savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    let counter = 1;
    let newFormName = `Form${counter}`;
    while (savedForms[newFormName]) {
      counter++;
      newFormName = `Form${counter}`;
    }

    this.formHeading = newFormName;
    this.showForm = newFormName;
    this.fields = [];
    this.users = [];
    this.model = {};

    savedForms[newFormName] = [];
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    let savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    savedEntries[newFormName] = [];
    localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

    this.loadSavedFormNames();
    this.fetchData();
    this.closeSideDiv();
  }

  saveForm() {
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    savedForms[this.formHeading] = this.fields;
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    this.formChanged = false;
    this.loadSavedFormNames(); // Refresh sidebar list
  }

  formNameChange(newWrapper: string) {
    if (!this.formHeading) return; // no active form

    // 🔹 Update wrapper for all fields in this form
    this.fields = this.fields.map(f => ({
      ...f,
      wrappers: [newWrapper]
    }));

    // 🔹 Persist in localStorage
    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    if (savedForms[this.formHeading]) {
      savedForms[this.formHeading] = this.fields;
      localStorage.setItem('savedForms', JSON.stringify(savedForms));
    }

    // 🔹 Keep current wrapper for new fields
    localStorage.setItem(`wrapper_${this.formHeading}`, newWrapper);

  }

  saveFormNameChange() {
    if (!this.editFormModel.formName) return;

    const oldName = this.editFormNameBefore || '';
    const newName = this.editFormModel.formName.trim();
    const newWrapper = this.editFormModel.wrapper || 'form-field-horizontal';

    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    const savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');

    // Prevent duplicate names
    if (savedForms[newName] && newName !== oldName) {
      alert("A form with this name already exists!");
      return;
    }

    // ✅ Handle wrapper change
    this.formNameChange(newWrapper);

    // ✅ Handle rename (if any)
    if (oldName && newName && oldName !== newName) {
      savedForms[newName] = savedForms[oldName];
      delete savedForms[oldName];

      savedEntries[newName] = savedEntries[oldName] || [];
      delete savedEntries[oldName];

      if (this.formHeading === oldName) this.formHeading = newName;
      if (this.showForm === oldName) this.showForm = newName;
    }

    localStorage.setItem('savedForms', JSON.stringify(savedForms));
    localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

    this.loadSavedFormNames();
  }

  deleteFormName() {
    const formName = this.editFormModel.formName?.trim();

    if (!formName) {
      alert("Form name is missing!");
      return;
    }

    const savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    const savedEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');

    if (savedForms[formName]) {
      delete savedForms[formName];
    }
    if (savedEntries[formName]) {
      delete savedEntries[formName];
    }

    // Remove wrapper from localStorage
    localStorage.removeItem(`wrapper_${formName}`);
    localStorage.removeItem('formFields');

    localStorage.setItem('savedForms', JSON.stringify(savedForms));
    localStorage.setItem('savedFormEntries', JSON.stringify(savedEntries));

    // If currently viewing the deleted form, clear UI
    if (this.formHeading === formName) {
      this.formHeading = '';
      this.fields = [];
      this.users = [];
      this.model = {};
    }

    if (formName === this.showForm) {
      this.showForm = '';
    }

    this.loadSavedFormNames();
  }

  fetchData() {
    const entries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    let formEntries = entries[this.formHeading] || [];

    // ✅ Filter empty id-only entries
    formEntries = formEntries.filter((e: {}) => {
      const keys = Object.keys(e);
      return !(keys.length === 1 && keys.includes('id'));
    });

    entries[this.formHeading] = formEntries;
    localStorage.setItem('savedFormEntries', JSON.stringify(entries));

    this.users = formEntries;

    // 🔹 Merge keys from fields and users
    const fieldKeysFromForm = this.fields.map(f => ({
      key: f.key as string,
      label: f.props?.label || f.key as string
    }));

    const fieldKeysFromUsers: { key: string, label: string }[] = [];
    formEntries.forEach((entry: {}) => {
      Object.keys(entry).forEach(k => {
        if (k !== 'id' && !fieldKeysFromForm.some(f => f.key === k) && !fieldKeysFromUsers.some(f => f.key === k)) {
          fieldKeysFromUsers.push({ key: k, label: k }); // Use key as label if deleted
        }
      });
    });

    this.displayFields = [...fieldKeysFromForm, ...fieldKeysFromUsers];
  }

  onSubmit(model: any) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    if (this.fields.length > 0) {
      const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
      const formEntries = allEntries[this.formHeading] || [];

      const newEntry = { id: Date.now(), ...model };
      formEntries.push(newEntry);

      allEntries[this.formHeading] = formEntries;
      localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));

      this.model = {};
      this.form.reset();
      this.fetchData();
      this.isEdit.set(false);
    }
  }

  update(model: any) {
    const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    const formEntries = allEntries[this.formHeading] || [];

    const updatedEntries = formEntries.map((entry: any) =>
      entry.id === this.uid() ? { id: this.uid(), ...model } : entry
    );

    allEntries[this.formHeading] = updatedEntries;
    localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));

    this.model = {};
    this.fetchData();
    this.isEdit.set(false);
  }

  deleteUser(id: any) {
    const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    const formEntries = allEntries[this.formHeading] || [];

    const updatedEntries = formEntries.filter((entry: any) => entry.id !== id);
    allEntries[this.formHeading] = updatedEntries;

    localStorage.setItem('savedFormEntries', JSON.stringify(allEntries));
    this.fetchData();
  }

  editUser(id: number) {
    const allEntries = JSON.parse(localStorage.getItem('savedFormEntries') || '{}');
    const formEntries = allEntries[this.formHeading] || [];
    const userToEdit = formEntries.find((entry: any) => entry.id === id);

    if (userToEdit) {
      this.model = { ...userToEdit };
      this.uid.set(id);
      this.editingId.set(id);
      this.isEdit.set(true);
    }
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

  reattachFieldFunctions() {
    this.fields = this.fields.map((field, index) => ({
      ...field,
      props: {
        ...field.props,
        index, // ✅ always reassign fresh index
        openEditFieldModal: () => this.openEditFieldModal(index),
        deleteField: () => this.deleteField(index),
        loadSavedForm: () => this.loadSavedForm(this.formHeading),
        openEditFormNameModal: () => this.openEditFormNameModal(this.formHeading),
        deleteFormName: () => this.deleteFormName(),
      }
    }));
  }

  addFixedField(type: 'input' | 'textarea' | 'select' | 'radio') {
    const baseStyle = {
      width:'', height:'', maxWidth:'', minWidth:'', maxHeight:'', minHeight:'', display:'', margin:'', marginTop:'', marginRight:'', marginBottom:'', marginLeft:'', padding:'', paddingTop:'', paddingRight:'', paddingBottom:'', paddingLeft:'', boxSizing:'', border:'1px solid #ccc', borderWidth:'', borderTopWidth:'', borderRightWidth:'', borderBottomWidth:'', borderLeftWidth:'', borderStyle:'', borderTopStyle:'', borderRightStyle:'', borderBottomStyle:'', borderLeftStyle:'', borderColor:'', borderTopColor:'', borderRightColor:'', borderBottomColor:'', borderLeftColor:'', borderRadius:'', outline:'', outlineColor:'', outlineWidth:'', outlineStyle:'', color:'', backgroundColor:'', backgroundImage:'', backgroundSize:'', backgroundRepeat:'', backgroundPosition:'', backgroundClip:'', backgroundOrigin:'', backgroundAttachment:'', fontFamily:'', fontSize:'', fontWeight:'', fontStyle:'', fontVariant:'', textAlign:'', textTransform:'', textDecoration:'', letterSpacing:'', wordSpacing:'', lineHeight:'', whiteSpace:'', textOverflow:'', boxShadow:'', textShadow:'', cursor:'', pointerEvents:'', userSelect:'', caretColor:'', transition:'', transitionProperty:'', transitionDuration:'', transitionTimingFunction:'', transitionDelay:'', animation:'', animationName:'', animationDuration:'', animationTimingFunction:'', animationDelay:'', animationIterationCount:'', animationDirection:'', animationFillMode:'', opacity:'', visibility:'', overflow:'', overflowX:'', overflowY:'', clipPath:''
    };
    const labelBaseStyle = {
      display:'', position:'', top:'', right:'', bottom:'', left:'', float:'', clear:'', zIndex:'', width:'', height:'', minWidth:'', maxWidth:'', minHeight:'', maxHeight:'', margin:'', marginTop:'', marginRight:'', marginBottom:'', marginLeft:'', padding:'', paddingTop:'', paddingRight:'', paddingBottom:'', paddingLeft:'', boxSizing:'', border:'', borderWidth:'', borderTopWidth:'', borderRightWidth:'', borderBottomWidth:'', borderLeftWidth:'', borderStyle:'', borderTopStyle:'', borderRightStyle:'', borderBottomStyle:'', borderLeftStyle:'', borderColor:'', borderTopColor:'', borderRightColor:'', borderBottomColor:'', borderLeftColor:'', borderRadius:'', borderTopLeftRadius:'', borderTopRightRadius:'', borderBottomRightRadius:'', borderBottomLeftRadius:'', background:'', backgroundColor:'', backgroundImage:'', backgroundSize:'', backgroundRepeat:'', backgroundPosition:'', backgroundClip:'', backgroundOrigin:'', backgroundAttachment:'', color:'', font:'', fontFamily:'', fontSize:'', fontWeight:'', fontStyle:'', fontVariant:'', fontStretch:'', lineHeight:'', letterSpacing:'', wordSpacing:'', textAlign:'', textTransform:'', textDecoration:'', textIndent:'', whiteSpace:'', textOverflow:'', direction:'', unicodeBidi:'', boxShadow:'', textShadow:'', opacity:'', visibility:'', cursor:'', pointerEvents:'', userSelect:'', caretColor:'', transition:'', transitionProperty:'', transitionDuration:'', transitionTimingFunction:'', transitionDelay:'', animation:'', animationName:'', animationDuration:'', animationTimingFunction:'', animationDelay:'', animationIterationCount:'', animationDirection:'', animationFillMode:'', clipPath:'', transform:'', transformOrigin:'', transformStyle:'', perspective:'', perspectiveOrigin:'', filter:'', mixBlendMode:''
    };
    const existingCount = this.fields.filter(f =>
      typeof f.key === 'string' && f.key.startsWith(type)
    ).length;
    const index = existingCount + 1;
    const currentWrapper = localStorage.getItem(`wrapper_${this.formHeading}`) || 'form-field-horizontal';

    const newField: FormlyFieldConfig = {
      key: `${type}${index}`,
      type,
      wrappers: [currentWrapper],
      props: {
        label: `${type}${index}`,
        id: `${type}${index}`,
        placeholder: type === 'textarea' ? `Enter ${type}${index} text` : `${type}${index}`,
        class: type === 'select' ? 'form-select mb-2' :
              type === 'radio' ? 'form-check-input mb-2' : 'form-control mb-2',
        required: false,
        labelClass: type === 'radio' ? 'form-check-label' : 'form-label',
        labelFor: `${type}${index}`,
        style: baseStyle, // your default style
        labelStyle: labelBaseStyle,
        index: this.fields.length, // <-- Save current index
      },
      validation: {
        messages: { required: "This field is required!" }
      }
    };

    if (type === 'select' || type === 'radio') {
      newField.props!.options = [
        { label: 'Option 1', value: 'Option 1' },
        { label: 'Option 2', value: 'Option 2' }
      ];
    }

    this.fields = [...this.fields, newField];

    // Update all indexes after addition
    this.fields.forEach((f, i) => f.props!['index'] = i);
    this.reattachFieldFunctions(); // 🔹 Make sure new one gets functions

    this.formChanged = true;
    this.cancelFieldModal();
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
    const labelStyle = field.props?.['labelStyle'] || {};

    this.modalModel = {
      key: field.key,
      label: field.props?.label || '',
      id: field.props?.['id'] || '',
      class: field.props?.['class'] || '',
      labelClass: field.props?.['labelClass'] || '',
      placeholder: field.props?.placeholder || '',
      required: !!field.props?.required,
      options: Array.isArray(field.props?.options)
        ? field.props.options.map((o: any) => o.label).join(', ')
        : '',
      ...style,
      ...labelStyle
    };

    // Start fields array
    this.modalFields = [
      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          { key: 'key', type: 'input', className: 'col-md-6', props: { label: 'Key', required: true } },
          { key: 'id', type: 'input', className: 'col-md-6', props: { label: 'ID' } },
          { key: 'label', type: 'input', className: 'col-md-6', props: { label: 'Label', required: true } },
          { key: 'placeholder', type: 'input', className: 'col-md-6', props: { label: 'Placeholder' } },
          { key: 'class', type: 'input', className: 'col-md-6', props: { label: 'Class' } },
          { key: 'labelClass', type: 'input', className: 'col-md-6', props: { label: 'Label Class' } },
          { key: 'required', type: 'checkbox', className: 'col-md-6', props: { label: 'Required' } },
        ]
      }
    ];

    if (type === 'select' || type === 'radio') {
      this.modalFields[0].fieldGroup?.push({
        key: 'options',
        type: 'input',
        className: 'col-md-6',
        props: { label: 'Options (comma separated)', required: true }
      });
    }

    // 🔹 Add a heading for Input Style
    this.modalFields.push({
      template: '<h4 class="mt-3 mb-2">Input Style</h4>'
    });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(style).map(sk => ({
        key: sk,
        type: 'input',
        className: 'col-md-6',
        props: { label: sk }
      }))
    });

    // 🔹 Add a heading for Label Style
    this.modalFields.push({
      template: '<h4 class="mt-3 mb-2">Label Style</h4>'
    });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(labelStyle).map(sk => ({
        key: sk,
        type: 'input',
        className: 'col-md-6',
        props: { label: sk }
      }))
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
    const updatedLabelStyle: any = {};

    // Collect style values
    const styleKeys = Object.keys(this.fields[this.editingFieldIndex]?.props?.['style'] || {});
    styleKeys.forEach(sk => {
      updatedStyle[sk] = this.modalModel[sk] || '';
    });

    // Collect labelStyle values
    const labelStyleKeys = Object.keys(this.fields[this.editingFieldIndex]?.props?.['labelStyle'] || {});
    labelStyleKeys.forEach(sk => {
      updatedLabelStyle[sk] = this.modalModel[sk] || '';
    });

    const updatedField: FormlyFieldConfig = {
      ...this.fields[this.editingFieldIndex],
      key: this.modalModel.key,
      props: {
        ...this.fields[this.editingFieldIndex].props,
        label: this.modalModel.label,
        class: this.modalModel.class,
        labelClass: this.modalModel.labelClass,
        placeholder: this.modalModel.placeholder,
        required: !!this.modalModel.required,
        index: this.editingFieldIndex, // <-- Save index
        options: this.modalModel.options
          ? this.modalModel.options.split(',').map((opt: string) => ({
              label: opt.trim(),
              value: opt.trim()
            }))
          : undefined,
        style: updatedStyle,
        labelStyle: updatedLabelStyle
      }
    };

    // ✅ Replace the field in a new array to trigger change detection
    const newFields = [...this.fields];
    newFields[this.editingFieldIndex] = updatedField;
    this.fields = newFields;

    // ✅ Save in localStorage
    let savedForms = JSON.parse(localStorage.getItem('savedForms') || '{}');
    savedForms[this.formHeading] = this.fields;
    localStorage.setItem('savedForms', JSON.stringify(savedForms));

    this.modalStep.set('select');
    this.editingFieldIndex = null;
    this.modalForm.reset();
    this.modalModel = {};
  }

  deleteField(index: number) {
    if (index >= 0 && index < this.fields.length) {
      this.fields = this.fields.filter((_, i) => i !== index);

      // Reassign index to all fields
      this.fields.forEach((f, i) => f.props!['index'] = i);

      localStorage.setItem('formFields', JSON.stringify(this.fields));

      this.fetchData();
      this.loadSavedFormNames();
      this.formChanged = true;

      if (this.fields.length === 0) {
        this.closeSideDiv();
      }
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

  closeForm() {
    this.fields = [];
    this.model = {};
    this.users = [];
    this.formHeading = '';
    this.showForm = '';
    this.formChanged = false;
    this.form.reset();
    this.isEdit.set(false);
  }

  menuVisible = false;
  formMenuVisible = false;
  editMenuVisible = false;
  menuPosition = { x: 0, y: 0 };

  @HostListener('document:click')
  hideMenu() {
    this.menuVisible = false;
    this.formMenuVisible = false;
    this.editMenuVisible = false;
  }

  selectedContextFormName = '';

  showContextMenu(event: MouseEvent, formName: string) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.selectedContextFormName = formName; // Store which form was right-clicked
    this.menuVisible = true;
  }

  showFormContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.formMenuVisible = true;
  }

  selectedFieldIndex: number | null = null; 

  editContextMenu(event: MouseEvent, index: number) {
    event.preventDefault(); // Stop default browser menu
    this.selectedFieldIndex = index; // Store the clicked field index
    this.menuPosition = { x: event.clientX, y: event.clientY }; // Position menu at cursor
    this.editMenuVisible = true; // Show the field edit menu
  }

  onMenuClick(action: 'loadSavedForm' | 'openEditFormNameModal' | 'deleteFormName' | 'openEditFieldModal' | 'deleteField') {
    if (action === 'openEditFormNameModal') {
      this.openEditFormNameModal(this.selectedContextFormName);
    } else if (action === 'deleteFormName') {
      this.editFormModel.formName = this.selectedContextFormName;
      this.deleteFormName();
    } else if (action === 'loadSavedForm') {
      this.loadSavedForm(this.selectedContextFormName);
    } else if (action === 'openEditFieldModal') {
      this.openEditFieldModal(this.selectedFieldIndex!);
    } else if (action === 'deleteField') {
      this.deleteField(this.selectedFieldIndex!);
    }
    this.editMenuVisible = false;
    this.selectedFieldIndex = null;
    this.menuVisible = false;
  }
}