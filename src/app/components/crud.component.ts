import { Component, HostListener, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, NgIf } from "@angular/common";
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormlyFormOptions, FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { FormService } from '../form.service';
import { FormlySelectModule } from '@ngx-formly/core/select';
import { TooltipDirective } from './tooltip.directive';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'crud-component',
  standalone: true,
  templateUrl: '../templates/crud.component.html',
  styleUrl: '../styles/crud.component.css',
  imports: [NgIf, FormlyForm, ReactiveFormsModule, CommonModule, FormlySelectModule, FormsModule, DragDropModule, TooltipDirective, HttpClientModule, NzFormModule, NzButtonModule, NzInputModule, NzIconModule, NzTableModule, NzTooltipModule],
})
export class CRUD {

  constructor(private fb: FormBuilder, private formService: FormService, private http: HttpClient) { }

  uid = signal(0);
  type = signal('');
  isEdit = signal(false);
  allFieldsModalOpen = signal(false);
  globalFieldsModalOpen = signal(false);
  modalStep = signal<'select' | 'configure'>('select');

  showForm = '';
  formHeading = '';
  editStr = 'Heading';
  searchTerm: string = '';
  editFormNameBefore = '';
  sortColumn: string = 'id';
  selectedContextFormName = '';
  pageSize = 3;
  totalPages = 0;
  currentPage = 1;
  isLoading = false;
  menuVisible = false;
  formChanged = false;
  formMenuVisible = false;
  editMenuVisible = false;
  sortAscending: boolean = true;
  menuPosition = { x: 0, y: 0 };
  editingFieldIndex: number | null = null;
  selectedFieldIndex: number | null = null;
  selectedRowIndex: number | null = null;
  selectedGroupIndex: number | null = null;
  expanded: { [k: string]: boolean } = {};

  users: any[] = [];
  filteredUsers: any[] = [];
  paginatedUsers: any[] = [];
  savedFormNames: string[] = [];
  displayFields: { key: string, label: string }[] = [];

  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {
    formState: { submitted: false },
    showError: (field) =>
      field.formControl?.invalid &&
      (field.formControl?.touched || this.options.formState?.submitted),
  };
  fields: FormlyFieldConfig[] = [];

  modalForm = new FormGroup({});
  modalModel: any = {};
  modalOptions: FormlyFormOptions = {};
  modalFields: FormlyFieldConfig[] = [];

  allFieldsForm = new FormGroup({});
  allFieldsModel: any = {};
  allFieldsFields: FormlyFieldConfig[] = [];

  globalFieldsForm = new FormGroup({});
  globalFieldsModel: any = {};
  globalFieldsFields: FormlyFieldConfig[] = [];

  editFormModal = new FormGroup({});
  editFormModel: any = {};
  editFormFields: FormlyFieldConfig[] = [
    {
      key: "formName",
      type: "input",
      wrappers: ["ngform-field-modal"],
      props: {
        uid: '1',
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
      wrappers: ["ngform-field-modal"],
      defaultValue: () => {
        return this.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'ngform-field-horizontal';

      },
      props: {
        uid: '1',
        label: "Form Wrapper",
        class: "form-check-input",
        labelClass: "form-check-label",
        id: "wrapper",
        required: true,
        options: [
          { value: "ngform-field-horizontal", label: "Horizontal Wrapper" },
          { value: "ngform-field-vertical", label: "Vertical Wrapper" },
        ],
      },
      validation: {
        messages: {
          required: "This field is required"
        }
      }
    }
  ];

  get showingRange(): string {
    if (this.users.length === 0) return '0 entries';
    if (this.users.length === 1) return '1 entries';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.users.length);
    return `${start} to ${end} of ${this.users.length} entries`;
  }

  get hasModel(): boolean {
    return this.model && Object.keys(this.model).length > 0;
  }

  ngOnInit() {
    this.fields = [];
    this.model = {};
    this.users = [];
    this.loadSavedFormNames();
  }

  showNotification(message: string | null) {
    const popup = document.getElementById('notification');
    if (!popup) return;
    popup.textContent = message ?? '';
    popup.classList.remove('hidden');
    popup.classList.add('show');
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.classList.add('hidden'), 100);
    }, 1000);
  }

  loadSavedFormNames() {
    this.http.get<any[]>(`http://localhost:3000/forms`)
      .subscribe({
        next: (forms) => {
          this.savedFormNames = forms
            .filter(f => f.template === 'ngzorro')
            .map(f => f.name);
        },
        error: (err) => {
          console.error('❌ Failed to load forms:', err);
          this.savedFormNames = [];
        }
      });
  }

  createNewForm() {
    let counter = 1;
    let newFormName = `Form${counter}`;
    this.http.get<any[]>(`http://localhost:3000/forms`).subscribe({
      next: (forms) => {
        const existingNames = forms.map(f => f.name);
        while (existingNames.includes(newFormName)) {
          counter++;
          newFormName = `Form${counter}`;
        }
        this.http.post<any>(`http://localhost:3000/forms`, { name: newFormName, template: 'ngzorro', fields: [] })
          .subscribe({
            next: (createdForm) => {
              this.formHeading = createdForm.name;
              this.showForm = createdForm.name;
              this.fields = [];
              this.users = [];
              this.form = new FormGroup({});
              this.model = {};
              this.loadSavedFormNames();
              this.fetchData();
              this.showNotification("Form created successfully!");
            },
            error: (err) => {
              console.error("❌ Failed to create form:", err);
            }
          });
      },
      error: (err) => {
        console.error("❌ Failed to load forms:", err);
      }
    });
  }

  loadSavedForm(formName: string) {
    this.formChanged = false;
    this.http.get<any>(`http://localhost:3000/forms/${formName}`).subscribe({
      next: (form) => {
        if (form) {
          this.showForm = formName;
          this.fields = form.fields.map((row: any) => ({
            ...row,
            fieldGroup: row.fieldGroup?.map((field: any) => ({
              ...field,
              wrappers: field.wrappers?.length ? field.wrappers : ['ngform-field-horizontal']
            }))
          }));
          this.formHeading = formName;
          this.reattachFieldFunctions();
          this.form = new FormGroup({});
          this.fields.forEach(row => {
            row.fieldGroup?.forEach(field => {
              const key = field.key as string;
              this.form.addControl(
                key,
                this.fb.control(
                  this.model[key] ?? '',
                  field.props?.required ? Validators.required : null
                )
              );
            });
          });
          this.fetchData();
          this.toggle('parent');
        }
      },
      error: (err) => {
        console.error("❌ Failed to load form:", err);
      }
    });
  }

  fetchData() {
    if (!this.formHeading) return;
    this.formService.getEntries(this.formHeading).subscribe({
      next: (formEntries: any[]) => {
        this.users = formEntries.map(e => ({ id: e.id, ...e.data }));
        this.applyFilter();
        if (this.users.length > 0) {
          const widest = this.users.reduce((max, u) =>
            Object.keys(u).length > Object.keys(max).length ? u : max, this.users[0]
          );
          const keys = Object.keys(widest).filter(k => k !== 'id');
          this.displayFields = keys.map(k => ({ key: k, label: k }));
        }
        this.updatePagination();
        this.onSort('ascend', 'id');
      },
      error: (err) => {
        console.error("❌ Error fetching entries:", err);
        this.users = [];
        this.displayFields = [];
        this.updatePagination();
      }
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  setPage(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePagination();
  }

  normalizeOrder(order: string | null): 'ascend' | 'descend' | null {
    if (order === 'ascend' || order === 'descend') {
      return order;
    }
    return null;
  }

  onSort(order: 'ascend' | 'descend' | null, column: string) {
    if (!order) {
      this.filteredUsers = [...this.users];
      this.updatePagination();
      return;
    }

    this.filteredUsers = [...this.users].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      if (valA == null && valB == null) return 0;
      if (valA == null) return order === 'ascend' ? -1 : 1;
      if (valB == null) return order === 'ascend' ? 1 : -1;

      if (!isNaN(valA) && !isNaN(valB)) {
        return order === 'ascend' ? valA - valB : valB - valA;
      }

      return order === 'ascend'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    this.updatePagination();
  }


  toggle(key: string) {
    this.expanded[key] = !this.expanded[key];
    if (key === 'parent' && !this.expanded[key]) {
      Object.keys(this.expanded).forEach(k => {
        if (k.startsWith('child-')) {
          this.expanded[k] = false;
        }
      });
    }
  }

  openEditFormNameModal(name: string) {
    this.http.get<any>(`http://localhost:3000/forms/${name}`).subscribe({
      next: (form) => {
        if (!form) return;
        const savedWrapper = form.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'ngform-field-horizontal';
        this.editFormModel = {
          formName: name,
          wrapper: savedWrapper
        };
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
      },
      error: (err) => {
        console.error("❌ Failed to load form for editing:", err);
        this.showNotification("Failed to load form data!");
      }
    });
  }

  saveFormNameChange() {
    if (this.formChanged) {
      if (!confirm("Are you sure to update the form info? changes will be lost!"))
        return
    }
    if (!this.editFormModel.formName) {
      alert("Form name is empty!");
      return;
    }
    const oldName = this.editFormNameBefore || '';
    const newName = this.editFormModel.formName.trim();
    const newWrapper = this.editFormModel.wrapper || 'ngform-field-horizontal';
    if (this.savedFormNames.includes(newName) && newName !== oldName) {
      alert("A form with this name already exists!");
      return;
    }
    this.http.put(`http://localhost:3000/forms/rename/${oldName}`, {
      newName,
      wrapper: newWrapper
    }).subscribe({
      next: () => {
        this.formHeading = newName;
        this.showForm = newName;
        this.loadSavedFormNames();
        this.showNotification("Successfully updated form info!");
        this.loadSavedForm(newName);
      },
      error: (err) => {
        console.error("❌ Failed to rename form:", err);
        this.showNotification("Error updating form info!");
      }
    });
  }

  deleteFormName() {
    const formName = this.editFormModel.formName?.trim();
    if (!formName) {
      alert("Form name is missing!");
      return;
    }
    if (!confirm(`Are you sure you want to delete form "${formName}"?`)) {
      return;
    }
    this.http.delete(`http://localhost:3000/forms/${formName}`)
      .subscribe({
        next: () => {
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
          this.showNotification("Form deleted successfully!");
        },
        error: (err) => {
          console.error("❌ Failed to delete form:", err);
          this.showNotification("Error deleting form!");
        }
      });
  }

  reattachFieldFunctions() {
    let globalIndex = 0;
    this.fields.forEach((row, rowIndex) => {
      row.fieldGroup?.forEach((field, colIndex) => {
        field.props!['index'] = globalIndex;
        field.props!['openEditFieldModal'] = () => this.openRowEditFieldModal(rowIndex, colIndex);
        field.props!['deleteField'] = () => this.deleteRowField(rowIndex, colIndex);
        field.props!['loadSavedForm'] = () => this.loadSavedForm(this.formHeading);
        field.props!['openEditFormNameModal'] = () => this.openEditFormNameModal(this.formHeading);
        field.props!['deleteFormName'] = () => this.deleteFormName();
        globalIndex++;
      });
    });
  }

  setSelectedRowIndex(i: number) {
    this.selectedRowIndex = i;
  }

  addFixedField(type: 'input' | 'textarea' | 'select' | 'radio' | 'div') {
    const baseStyle = { borderRadius: '', color: '', backgroundColor: '', fontFamily: '', fontSize: '', fontWeight: '', width: '100%' };
    const labelBaseStyle = { backgroundColor: '', color: '', fontFamily: '', fontSize: '', fontWeight: '' };

    const existingIndexes = this.fields
      .flatMap(f => f.fieldGroup || [])
      .filter(f => typeof f.key === 'string' && f.key.startsWith(type))
      .map(f => parseInt((f.key as string).replace(type, ''), 10))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);
    let index = 1;
    for (const num of existingIndexes) if (num === index) index++; else break;
    const currentWrapper = this.fields?.[0]?.fieldGroup?.[0]?.wrappers?.[0] ?? 'ngform-field-horizontal';
    const newField: FormlyFieldConfig = {
      className: 'col-12',
      key: `${type}${index}`,
      type: (type === 'div' ? 'input' : type),
      wrappers: [currentWrapper],
      props: {
        label: `${type}${index}`,
        id: `${type}${index}`,
        ...(type === 'textarea' || type === 'input' || type === 'div' ? { placeholder: `${type}${index}` } : {}),
        class: type === 'select' ? 'form-select' :
          type === 'radio' ? 'form-check-input' : 'form-control',
        required: true,
        labelClass: type === 'radio' ? 'form-check-label' : 'form-label',
        labelFor: `${type}${index}`,
        style: baseStyle,
        labelStyle: labelBaseStyle,
        ...(type === 'select' ? {
          options: [
            { label: 'Select an option...', value: '', disabled: true },
            { label: 'Option 1', value: 'Option 1' },
            { label: 'Option 2', value: 'Option 2' }
          ]
        } : {}),
        ...(type === 'radio' ? {
          options: [
            { label: 'Option 1', value: 'Option 1' },
            { label: 'Option 2', value: 'Option 2' }
          ]
        } : {})
      },
      validation: { messages: { required: "This field is required!" } }
    };
    if (type === 'select') newField.defaultValue = '';
    if (type === 'div') {
      this.fields.push({
        fieldGroupClassName: 'row',
        fieldGroup: []
      });
    } else {
      if (this.selectedRowIndex !== null) {
        this.fields[this.selectedRowIndex].fieldGroup?.push(newField);
      } else {
        if (this.fields.length === 0) {
          this.fields.push({
            fieldGroupClassName: 'row',
            fieldGroup: [newField]
          });
        } else {
          this.fields[0].fieldGroup?.push(newField);
        }
      }
    }
    this.fields = [...this.fields];
    this.selectedFieldIndex = null;
    this.reattachFieldFunctions();
    this.cancelFieldModal();
    this.formChanged = true;
    this.showNotification('Field added (not saved yet)!');
  }

  cancelFieldModal() {
    this.modalStep.set('select');
    this.modalForm.reset();
    this.modalModel = {};
    this.modalFields = [];
    this.editingFieldIndex = null;
  }

  deleteRowField(rowIndex: number, fieldIndex: number) {
    if (!confirm("Are you sure you want to delete this field?")) return;
    const row = this.fields[rowIndex];
    if (!row?.fieldGroup) return;
    const field = row.fieldGroup[fieldIndex];
    if (field?.key && this.form.contains(field.key as string)) {
      this.form.removeControl(field.key as string);
    }
    row.fieldGroup.splice(fieldIndex, 1);
    if (row.fieldGroup.length === 0) {
      this.fields.splice(rowIndex, 1);
    }
    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.showNotification('Field successfully deleted!');
  }

  drop(event: CdkDragDrop<FormlyFieldConfig[]>, list: FormlyFieldConfig[]) {
    if (event.previousContainer === event.container) {
      moveItemInArray(list, event.previousIndex, event.currentIndex);
    }
    else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    list.forEach((f, i) => {
      if (!f.props) f.props = {};
      f.props['index'] = i;
    });
    this.reattachFieldFunctions();
    this.formChanged = true;
  }

  onDragStart() {
    document.body.style.cursor = 'grabbing';
    setTimeout(() => {
      const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
      if (preview) preview.style.cursor = 'grabbing';
      const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
      overlays.forEach(o => (o as HTMLElement).style.cursor = 'grabbing');
    }, 0);
  }

  onDragEnd() {
    document.body.style.cursor = '';
    const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (preview) preview.style.cursor = '';
    const overlays = document.querySelectorAll('.cdk-overlay-container, .cdk-global-overlay-wrapper');
    overlays.forEach(o => (o as HTMLElement).style.cursor = '');
  }

  saveForm() {
    const formPayload = {
      name: this.formHeading,
      fields: this.fields,
    };
    this.http.post('http://localhost:3000/forms', formPayload).subscribe({
      next: () => {
        this.formChanged = false;
        this.loadSavedFormNames();
        this.showNotification("Form saved successfully!");

        this.loadSavedForm(this.formHeading);
      },
      error: (err) => {
        console.error("❌ Failed to save form:", err);
        this.showNotification("Failed to save form!");
      }
    });
  }

  getValue(user: any, key: any) {
    if (!key) return '';
    return user[key] ?? '';
  }

  openRowEditFieldModal(rowIndex: number, fieldIndex: number) {
    const field = this.fields[rowIndex].fieldGroup![fieldIndex];
    this.editingFieldIndex = field.props?.['index'] ?? null;
    if (this.editingFieldIndex === null) return;
    const type = typeof field.type === 'string' ? field.type : 'input';
    this.type.set(type);
    this.modalStep.set('configure');
    const style = field.props?.['style'] || {};
    const labelStyle = field.props?.['labelStyle'] || {};
    this.modalModel = {
      key: field.key,
      label: field.props?.label || '',
      className: field.className || '',
      class: field.props?.['class'] || '',
      labelClass: field.props?.['labelClass'] || '',
      placeholder: field.props?.placeholder || '',
      required: !!field.props?.required,
      options: Array.isArray(field.props?.options)
        ? field.props.options.map((o: any) => o.label).join(', ')
        : '',
      style: { ...style },
      labelStyle: { ...labelStyle }
    };
    this.modalFields = [
      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          { key: 'key', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Key', required: true } },
          { key: 'label', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Label', required: true } },
          ...(type === 'input' || type === 'textarea'
            ? [{ key: 'placeholder', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Placeholder' } }]
            : []),
          { key: 'class', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Class' } },
          { key: 'labelClass', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Label Class' } },
          { key: 'className', type: 'input', className: 'col-6', wrappers: ['ngform-field-modal'], props: { label: 'Class Name' } },
        ]
      }
    ];
    if (type === 'select' || type === 'radio') {
      this.modalFields[0].fieldGroup?.push({
        key: 'options',
        type: 'input',
        className: 'col-md-6',
        wrappers: ['ngform-field-modal'],
        props: { label: 'Options (comma separated)', required: true }
      });
    }
    this.modalFields.push({ key: 'required', type: 'checkbox', className: 'col-md-6', props: { label: 'Required' } });
    this.modalFields.push({ template: '<h4 class="mt-3 mb-2">Input Style</h4>' });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(style).map(sk => ({
        key: `style.${sk}`,
        type: 'input',
        className: 'col-md-6',
        wrappers: ['ngform-field-modal'],
        props: { label: sk }
      }))
    });
    this.modalFields.push({ template: '<h4 class="mt-3 mb-2">Label Style</h4>' });
    this.modalFields.push({
      fieldGroupClassName: 'row',
      fieldGroup: Object.keys(labelStyle).map(sk => ({
        key: `labelStyle.${sk}`,
        type: 'input',
        className: 'col-md-6',
        wrappers: ['ngform-field-modal'],
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
    let targetRowIndex = -1;
    let targetFieldIndex = -1;
    let globalIndex = 0;
    outer: for (let r = 0; r < this.fields.length; r++) {
      const row = this.fields[r];
      for (let f = 0; f < (row.fieldGroup?.length || 0); f++) {
        if (globalIndex === this.editingFieldIndex) {
          targetRowIndex = r;
          targetFieldIndex = f;
          break outer;
        }
        globalIndex++;
      }
    }
    if (targetRowIndex === -1 || targetFieldIndex === -1) return;
    const row = this.fields[targetRowIndex];
    const field = row.fieldGroup![targetFieldIndex];
    const oldKey = field.key as string;
    const newKey = this.modalModel.key;
    if (oldKey && newKey && oldKey !== newKey) {
      this.updateFieldKey(oldKey, newKey);
    }
    const updatedStyle: any = {};
    Object.keys(field.props?.['style'] || {}).forEach(k => {
      let val = this.modalModel.style?.[k] || '';
      if ((k === 'borderRadius' || k === 'fontSize') && val !== '') {
        const num = val.toString().trim();
        if (/^\d+$/.test(num)) {
          val = `${num}px`;
        }
      }
      updatedStyle[k] = val;
    });
    const updatedLabelStyle: any = {};
    Object.keys(field.props?.['labelStyle'] || {}).forEach(k => {
      let val = this.modalModel.labelStyle?.[k] || '';
      if (k === 'fontSize' && val !== '') {
        const num = val.toString().trim();
        if (/^\d+$/.test(num)) {
          val = `${num}px`;
        }
      }
      updatedLabelStyle[k] = val;
    });
    const updatedField: FormlyFieldConfig = {
      ...field,
      key: newKey,
      className: this.modalModel.className,
      props: {
        ...field.props,
        label: this.modalModel.label,
        class: this.modalModel.class,
        id: newKey,
        labelClass: this.modalModel.labelClass,
        placeholder: this.modalModel.placeholder,
        required: !!this.modalModel.required,
        index: this.editingFieldIndex,
        options: this.modalModel.options
          ? this.modalModel.options.split(',').map((opt: string) => ({
            label: opt.trim(),
            value: opt.trim()
          }))
          : field.props?.options,
        style: updatedStyle,
        labelStyle: updatedLabelStyle
      }
    };
    row.fieldGroup![targetFieldIndex] = updatedField;
    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.editingFieldIndex = null;
    this.modalStep.set('select');
    this.modalForm.reset();
    this.modalModel = {};
    this.showNotification('Field updated (remember to Save Form)!');
  }

  updateFieldKey(oldKey: string, newKey: string) {
    this.users = this.users.map(u => {
      const newObj: any = {};
      for (const k of Object.keys(u)) {
        if (k === oldKey) {
          newObj[newKey] = u[k];
        } else {
          newObj[k] = u[k];
        }
      }
      return newObj;
    });
    if (this.model.hasOwnProperty(oldKey)) {
      const newModel: any = {};
      for (const k of Object.keys(this.model)) {
        if (k === oldKey) {
          newModel[newKey] = this.model[k];
        } else {
          newModel[k] = this.model[k];
        }
      }
      this.model = newModel;
    }
    if (this.form.contains(oldKey)) {
      const ctrl = this.form.get(oldKey);
      this.form.removeControl(oldKey);
      this.form.addControl(newKey, ctrl!);
    }
    this.users.forEach(user => {
      const { id, ...data } = user;
      this.formService.updateEntry(this.formHeading, id, data).subscribe();
    });
    this.displayFields = this.displayFields.map(f =>
      f.key === oldKey ? { key: newKey, label: f.label } : f
    );
  }

  openAllFieldsModal(groupIndex: number) {
    this.selectedGroupIndex = groupIndex;
    this.toggleAllFieldsModal();
  }

  toggleAllFieldsModal() {
    if (!this.allFieldsModalOpen()) {
      this.allFieldsModel = {};
      let counter = 0;
      const targetGroup = this.selectedGroupIndex !== null
        ? this.fields[this.selectedGroupIndex].fieldGroup ?? []
        : [];
      this.allFieldsFields = targetGroup.map((f) => {
        const i = counter++;
        this.allFieldsModel[`key_${i}`] = f.key;
        this.allFieldsModel[`className_${i}`] = f.className;
        this.allFieldsModel[`label_${i}`] = f.props?.label;
        this.allFieldsModel[`placeholder_${i}`] = f.props?.placeholder;
        this.allFieldsModel[`class_${i}`] = f.props?.['class'];
        this.allFieldsModel[`required_${i}`] = f.props?.required;
        if (f.type === 'select' || f.type === 'radio') {
          this.allFieldsModel[`options_${i}`] = Array.isArray(f.props?.options)
            ? f.props.options.map((opt: any) => opt.label || opt).join(',')
            : '';
        }
        return {
          fieldGroupClassName: 'row mb-3',
          fieldGroup: [
            { template: `<h4 class="mt-3 mb-2">${f.key}</h4>` },
            { key: `key_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Key` } },
            { key: `label_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Label` } },
            f.type === 'select' || f.type === 'radio'
              ? { key: `options_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Options` } }
              : { key: `placeholder_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Placeholder` } },
            { key: `className_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Class Name` } },
            { key: `required_${i}`, type: 'checkbox', className: 'col-3', wrappers: ['ngform-field-modal'], props: { Label: 'Required' } }
          ]
        };
      });
      this.allFieldsForm = this.fb.group({});
      this.allFieldsModalOpen.set(true);
    } else {
      this.allFieldsModalOpen.set(false);
    }
  }

  saveAllFieldsEdit() {
    if (this.selectedGroupIndex === null) return;
    let counter = 0;
    const updatedGroup = this.fields[this.selectedGroupIndex].fieldGroup?.map(field => {
      const i = counter++;
      const updatedProps: any = {
        ...field.props,
        label: this.allFieldsModel[`label_${i}`] ?? field.props?.label,
        class: this.allFieldsModel[`class_${i}`] ?? field.props?.['class'],
        required: !!this.allFieldsModel[`required_${i}`]
      };
      if (field.type === 'select' || field.type === 'radio') {
        const optsStr = this.allFieldsModel[`options_${i}`];
        updatedProps.options = optsStr
          ? optsStr.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }))
          : field.props?.options;
      } else {
        updatedProps.placeholder = this.allFieldsModel[`placeholder_${i}`] ?? field.props?.placeholder;
      }
      return {
        ...field,
        key: this.allFieldsModel[`key_${i}`] ?? field.key,
        className: this.allFieldsModel[`className_${i}`] ?? field.className,
        props: updatedProps
      };
    }) ?? [];
    this.fields[this.selectedGroupIndex] = {
      ...this.fields[this.selectedGroupIndex],
      fieldGroup: updatedGroup
    };
    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.allFieldsModalOpen.set(false);
    this.showNotification('Field group updated (remember to Save Form)!');
  }

  toggleGlobalFieldsModal() {
    if (!this.globalFieldsModalOpen()) {
      this.globalFieldsModel = {};
      let counter = 0;
      this.globalFieldsFields = this.fields.flatMap((row) =>
        row.fieldGroup?.map((f) => {
          const i = counter++;
          this.globalFieldsModel[`key_${i}`] = f.key;
          this.globalFieldsModel[`className_${i}`] = f.className;
          this.globalFieldsModel[`label_${i}`] = f.props?.label;
          this.globalFieldsModel[`placeholder_${i}`] = f.props?.placeholder;
          this.globalFieldsModel[`class_${i}`] = f.props?.['class'];
          this.globalFieldsModel[`required_${i}`] = f.props?.required;

          if (f.type === 'select' || f.type === 'radio') {
            this.globalFieldsModel[`options_${i}`] = Array.isArray(f.props?.options)
              ? f.props.options.map((opt: any) => opt.label || opt).join(',')
              : '';
          }
          return {
            fieldGroupClassName: 'row mb-3',
            fieldGroup: [
              { template: `<h4 class="mt-3 mb-2">${f.key}</h4>` },
              { key: `key_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Key` } },
              { key: `label_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Label` } },
              f.type === 'select' || f.type === 'radio'
                ? { key: `options_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Options` } }
                : { key: `placeholder_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Placeholder` } },
              { key: `className_${i}`, type: 'input', className: 'col-3', wrappers: ['ngform-field-modal'], props: { label: `Class Name` } },
              { key: `required_${i}`, type: 'checkbox', className: 'col-3', wrappers: ['ngform-field-modal'], props: { Label: 'Required' } }
            ]
          };
        }) || []
      );
      this.globalFieldsForm = this.fb.group({});
      this.globalFieldsModalOpen.set(true);
    } else {
      this.globalFieldsModalOpen.set(false);
    }
  }

  saveGlobalFieldsEdit() {
    let counter = 0;
    this.fields = this.fields.map(row => ({
      ...row,
      fieldGroup: row.fieldGroup?.map(field => {
        const i = counter++;
        const updatedProps: any = {
          ...field.props,
          label: this.globalFieldsModel[`label_${i}`] ?? field.props?.label,
          class: this.globalFieldsModel[`class_${i}`] ?? field.props?.['class'],
          required: !!this.globalFieldsModel[`required_${i}`]
        };
        if (field.type === 'select' || field.type === 'radio') {
          const optsStr = this.globalFieldsModel[`options_${i}`];
          updatedProps.options = optsStr
            ? optsStr.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }))
            : field.props?.options;
        } else {
          updatedProps.placeholder = this.globalFieldsModel[`placeholder_${i}`] ?? field.props?.placeholder;
        }
        return {
          ...field,
          key: this.globalFieldsModel[`key_${i}`] ?? field.key,
          className: this.globalFieldsModel[`className_${i}`] ?? field.className,
          props: updatedProps
        };
      })
    }));
    this.fields = [...this.fields];
    this.reattachFieldFunctions();
    this.formChanged = true;
    this.globalFieldsModalOpen.set(false);
    this.showNotification('All fields updated (remember to Save Form)!');
  }

  deleteFieldGroup(index: number) {
    if (!confirm("Delete this div and its fields?")) return;
    this.fields.splice(index, 1);
    this.fields = [...this.fields];
    this.formChanged = true;
    this.showNotification("Field group deleted (remember to Save Form)!");
  }

  deleteAllFields() {
    if (!this.formHeading) return;
    if (!confirm("Are you sure you want to delete all fields?")) return;
    this.fields = [];
    this.form = new FormGroup({});
    this.model = {};
    this.displayFields = [];
    this.fields = [...this.fields];
    this.formChanged = true;
    this.showNotification("All fields deleted (remember to Save Form)!");
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(user =>
        Object.values(user).some(v =>
          v != null && v.toString().toLowerCase().includes(term)
        )
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  resetSearch() {
    this.searchTerm = '';
    this.filteredUsers = [...this.users];
    this.currentPage = 1;
    this.updatePagination();
  }

  onSubmit(model: any) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.formChanged) {
      alert('Please save the form before submitting data!');
      return;
    }
    this.isLoading = true;
    this.options.formState.submitted = true;
    if (this.fields.length > 0) {
      const newEntry = {
        ...model
      };
      this.formService.createEntry(this.formHeading, newEntry).subscribe(() => {
        this.resetForm();
        this.fetchData();
        this.isEdit.set(false);
        this.showNotification('Successfully submitted!');
      });
    }
    this.isLoading = false;
  }

  editUser(id: number) {
    this.formService.getEntry(this.formHeading, id).subscribe({
      next: (entry) => {
        this.model = { ...entry.data };
        this.uid.set(id);
        this.isEdit.set(true);
      },
      error: (err) => {
        console.error("❌ Failed to fetch entry:", err);
        this.showNotification('❌ Could not load entry for editing.');
      }
    });
  }

  cancel() {
    this.isEdit.set(false);
    this.model = {};
    this.form.reset();
    this.fetchData();
  }

  update(model: any) {
    if (this.formChanged) {
      alert("Please save the form before submitting data!");
    } else {
      this.formService.updateEntry(this.formHeading, this.uid(), model).subscribe({
        next: () => {
          this.model = {};
          this.fetchData();
          this.isEdit.set(false);
          this.resetForm();
          this.showNotification('✅ Successfully updated info!');
        },
        error: (err) => {
          console.error("❌ Update failed:", err);
          this.showNotification('❌ Failed to update entry!');
        }
      });
    }
  }

  resetForm() {
    this.model = {};
    this.form.reset();
    this.options.formState.submitted = false;
  }

  deleteUser(id: number) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    this.http.delete(`http://localhost:3000/forms/${this.formHeading}/entries/${id}`)
      .subscribe({
        next: () => {
          this.fetchData();
          this.showNotification('Successfully deleted info!');
        },
        error: (err: any) => {
          console.error('❌ Failed to delete entry:', err);
          this.showNotification('Failed to delete entry!');
        }
      });
  }

  @HostListener('document:click')
  hideMenu() {
    this.menuVisible = false;
    this.formMenuVisible = false;
    this.editMenuVisible = false;
  }

  showContextMenu(event: MouseEvent, formName: string) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.selectedContextFormName = formName;
    this.menuVisible = true;
  }

  showFormContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.formMenuVisible = true;
  }

  editContextMenu(event: MouseEvent, rowIndex: number, fieldIndex: number) {
    event.preventDefault();
    this.selectedRowIndex = rowIndex;
    this.selectedFieldIndex = fieldIndex;
    this.menuPosition = { x: event.clientX, y: event.clientY };
    this.editMenuVisible = true;
  }

  onMenuClick(action: 'deleteFormName' | 'openEditFormNameModal' | 'loadSavedForm' | 'openEditFieldModal' | 'deleteField') {
    if (action === 'openEditFormNameModal') {
      this.openEditFormNameModal(this.selectedContextFormName);
    } else if (action === 'deleteFormName') {
      this.editFormModel.formName = this.selectedContextFormName;
      this.deleteFormName();
    } else if (action === 'loadSavedForm') {
      this.loadSavedForm(this.selectedContextFormName);
    } else if (action === 'openEditFieldModal') {
      if (this.selectedRowIndex !== null && this.selectedFieldIndex !== null) {
        this.openRowEditFieldModal(this.selectedRowIndex, this.selectedFieldIndex);
      }
    } else if (action === 'deleteField') {
      if (this.selectedRowIndex !== null && this.selectedFieldIndex !== null) {
        this.deleteRowField(this.selectedRowIndex, this.selectedFieldIndex);
      }
    }
    this.editMenuVisible = false;
    this.selectedRowIndex = null;
    this.selectedFieldIndex = null;
    this.menuVisible = false;
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
}