import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

declare var bootstrap: any;

@Directive({
  selector: '[appTooltip]'
})
export class TooltipDirective implements AfterViewInit, OnDestroy {

  constructor(private el: ElementRef) {}

  private tooltipInstance: any;

  ngAfterViewInit() {
    this.tooltipInstance = new bootstrap.Tooltip(this.el.nativeElement, {
      trigger: 'hover',
      placement: 'auto',
      delay: { show: 100, hide: 100 }
    });
  }

  ngOnDestroy() {
    if (this.tooltipInstance) {
      this.tooltipInstance.dispose();
    }
  }
}
