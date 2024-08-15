import { Action, EventRegistry, ReducedValue, Scope } from 'fluentlyjs';

export class PopupFormModal<RESULT extends Exclude<{}, null>> {
  private readonly openModalEvent: EventRegistry<RESULT | null>;

  private readonly closeModalEvent: EventRegistry<void>;

  private readonly submitModalEvent: EventRegistry<RESULT>;

  private readonly submitSucceededEvent: EventRegistry<RESULT>;

  private readonly submitFailedEvent: EventRegistry<void>;

  private readonly modalVisible: ReducedValue<boolean>;

  private readonly modalResult: ReducedValue<RESULT | null>;

  private readonly submitAction: Action<RESULT, any>;

  constructor(submitAction: Action<RESULT, any>, scope = Scope.global) {
    this.openModalEvent = new EventRegistry(scope);
    this.closeModalEvent = new EventRegistry(scope);
    this.submitModalEvent = new EventRegistry(scope);
    this.submitSucceededEvent = new EventRegistry(scope);
    this.submitFailedEvent = new EventRegistry(scope);

    this.submitAction = submitAction;
    this.submitAction.runOn(this.submitModalEvent, (it) => it);
    this.submitAction.triggersFailedEvent(this.submitFailedEvent, (error) => {
      console.log('Submit failed:', error);
    });
    this.submitAction.triggersDoneEventWithMapper(
      this.submitSucceededEvent,
      (_data, submitArg) => submitArg,
    );

    this.modalVisible = ReducedValue.builder<boolean>()
      .addReducer(this.openModalEvent, () => true)
      .addReducer(this.closeModalEvent, () => false)
      .addReducer(this.submitSucceededEvent, () => false)
      .build(false);

    this.modalResult = ReducedValue.builder<RESULT | null>()
      .addReducer(this.submitSucceededEvent, (_, result) => result)
      .addReducer(
        this.openModalEvent,
        (_, initialValue) => initialValue ?? null,
      )
      .build(null);
  }

  get result() {
    return this.modalResult.value;
  }

  get visible() {
    return this.modalVisible.value;
  }

  get submitting() {
    return this.submitAction.state === 'running';
  }

  openModal(initialValue?: RESULT) {
    if (this.submitting) {
    }

    this.openModalEvent.emitOnce(initialValue ?? null);
  }

  closeModal() {
    this.closeModalEvent.emitOnce();
  }

  submitModal(result: RESULT) {
    this.submitModalEvent.emitOnce(result);
  }
}
