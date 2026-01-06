import type { SourceImage } from 'client/lazy-app/Compress';
import Checkbox from 'client/lazy-app/Compress/Options/Checkbox';
import Expander from 'client/lazy-app/Compress/Options/Expander';
import Select from 'client/lazy-app/Compress/Options/Select';
import * as style from 'client/lazy-app/Compress/Options/style.css';
import {
  inputFieldChecked,
  inputFieldValue,
  inputFieldValueAsNumber,
  preventDefault,
} from 'client/lazy-app/util';
import {
  builtinResize,
  BuiltinResizeMethod,
  drawableToImageData,
} from 'client/lazy-app/util/canvas';
import type WorkerBridge from 'client/lazy-app/worker-bridge';
import linkState from 'linkstate';
import { Component, h } from 'preact';
import { linkRef } from 'shared/prerendered-app/util';
import {
  BrowserResizeOptions,
  Options as ResizeOptions,
  VectorResizeOptions,
  workerResizeMethods,
  WorkerResizeOptions,
} from '../shared/meta';
import { getContainOffsets } from '../shared/util';

/**
 * Return whether a set of options are worker resize options.
 *
 * @param opts
 */
function isWorkerOptions(opts: ResizeOptions): opts is WorkerResizeOptions {
  return (workerResizeMethods as string[]).includes(opts.method);
}

function resolveResizeOptions(
  source: SourceImage,
  options: ResizeOptions,
): ResizeOptions {
  if (options.sizeMode !== 'longest-side') {
    return { ...options, sizeMode: 'dimensions' };
  }

  const baseWidth =
    options.method === 'vector' && source.vectorImage
      ? source.vectorImage.width
      : source.preprocessed.width;
  const baseHeight =
    options.method === 'vector' && source.vectorImage
      ? source.vectorImage.height
      : source.preprocessed.height;
  const longestSide = Math.max(
    1,
    Math.min(9999, Math.round(options.longestSide)),
  );
  const isLandscape = baseWidth >= baseHeight;
  const width = isLandscape
    ? longestSide
    : Math.max(1, Math.round((longestSide * baseWidth) / baseHeight));
  const height = isLandscape
    ? Math.max(1, Math.round((longestSide * baseHeight) / baseWidth))
    : longestSide;

  return {
    ...options,
    width,
    height,
    fitMethod: 'stretch',
  };
}

function browserResize(data: ImageData, opts: BrowserResizeOptions): ImageData {
  let sx = 0;
  let sy = 0;
  let sw = data.width;
  let sh = data.height;

  if (opts.fitMethod === 'contain') {
    ({ sx, sy, sw, sh } = getContainOffsets(sw, sh, opts.width, opts.height));
  }

  return builtinResize(
    data,
    sx,
    sy,
    sw,
    sh,
    opts.width,
    opts.height,
    opts.method.slice('browser-'.length) as BuiltinResizeMethod,
  );
}

function vectorResize(
  data: HTMLImageElement,
  opts: VectorResizeOptions,
): ImageData {
  let sx = 0;
  let sy = 0;
  let sw = data.width;
  let sh = data.height;

  if (opts.fitMethod === 'contain') {
    ({ sx, sy, sw, sh } = getContainOffsets(sw, sh, opts.width, opts.height));
  }

  return drawableToImageData(data, {
    sx,
    sy,
    sw,
    sh,
    width: opts.width,
    height: opts.height,
  });
}

export async function resize(
  signal: AbortSignal,
  source: SourceImage,
  options: ResizeOptions,
  workerBridge: WorkerBridge,
) {
  const resolvedOptions = resolveResizeOptions(source, options);
  if (options.method === 'vector') {
    if (!source.vectorImage) throw Error('No vector image available');
    return vectorResize(
      source.vectorImage,
      resolvedOptions as VectorResizeOptions,
    );
  }
  if (isWorkerOptions(resolvedOptions)) {
    try {
      return await workerBridge.resize(
        signal,
        source.preprocessed,
        resolvedOptions,
      );
    } catch (error) {
      const message =
        error && typeof (error as Error).message === 'string'
          ? (error as Error).message
          : '';
      const name =
        error && typeof (error as Error).name === 'string'
          ? (error as Error).name
          : '';
      if (
        message.includes('offset is out of bounds') ||
        name === 'RangeError'
      ) {
        const fallbackOptions: BrowserResizeOptions = {
          width: resolvedOptions.width,
          height: resolvedOptions.height,
          fitMethod: resolvedOptions.fitMethod,
          sizeMode: resolvedOptions.sizeMode,
          longestSide: resolvedOptions.longestSide,
          method: 'browser-high',
        };
        console.warn(
          'Resize worker failed; falling back to browser resize.',
          error,
        );
        return browserResize(source.preprocessed, fallbackOptions);
      }
      throw error;
    }
  }
  return browserResize(
    source.preprocessed,
    resolvedOptions as BrowserResizeOptions,
  );
}

interface Props {
  isVector: Boolean;
  inputWidth: number;
  inputHeight: number;
  options: ResizeOptions;
  onChange(newOptions: ResizeOptions): void;
}

interface State {
  maintainAspect: boolean;
}

const sizePresets = [0.25, 0.3333, 0.5, 1, 2, 3, 4];

export class Options extends Component<Props, State> {
  state: State = {
    maintainAspect: true,
  };

  private form?: HTMLFormElement;
  private presetWidths: { [idx: number]: number } = {};
  private presetHeights: { [idx: number]: number } = {};

  constructor(props: Props) {
    super(props);
    this.generatePresetValues(props.inputWidth, props.inputHeight);
  }

  private reportOptions() {
    const form = this.form!;
    const sizeMode = inputFieldValue(
      form.sizeMode,
      this.props.options.sizeMode,
    ) as ResizeOptions['sizeMode'];
    const width = form.width as HTMLInputElement;
    const height = form.height as HTMLInputElement;
    const longestSide = form.longestSide as HTMLInputElement;
    const { options } = this.props;

    if (
      sizeMode === 'dimensions' &&
      (!width.checkValidity() || !height.checkValidity())
    )
      return;

    if (sizeMode === 'longest-side' && !longestSide.checkValidity()) return;

    const newOptions: ResizeOptions = {
      width: inputFieldValueAsNumber(width),
      height: inputFieldValueAsNumber(height),
      longestSide: inputFieldValueAsNumber(longestSide),
      method: form.resizeMethod.value,
      premultiply: inputFieldChecked(form.premultiply, true),
      linearRGB: inputFieldChecked(form.linearRGB, true),
      // Casting, as the formfield only returns the correct values.
      fitMethod:
        sizeMode === 'longest-side'
          ? 'stretch'
          : (inputFieldValue(
              form.fitMethod,
              options.fitMethod,
            ) as ResizeOptions['fitMethod']),
      sizeMode,
    };
    this.props.onChange(newOptions);
  }

  private onChange = () => {
    this.reportOptions();
  };

  private getAspect() {
    return this.props.inputWidth / this.props.inputHeight;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!prevState.maintainAspect && this.state.maintainAspect) {
      this.form!.height.value = Math.round(
        Number(this.form!.width.value) / this.getAspect(),
      );
      this.reportOptions();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      this.props.inputWidth !== nextProps.inputWidth ||
      this.props.inputHeight !== nextProps.inputHeight
    ) {
      this.generatePresetValues(nextProps.inputWidth, nextProps.inputHeight);
    }
  }

  private onWidthInput = () => {
    if (this.state.maintainAspect) {
      const width = inputFieldValueAsNumber(this.form!.width);
      this.form!.height.value = Math.round(width / this.getAspect());
    }

    this.reportOptions();
  };

  private onHeightInput = () => {
    if (this.state.maintainAspect) {
      const height = inputFieldValueAsNumber(this.form!.height);
      this.form!.width.value = Math.round(height * this.getAspect());
    }

    this.reportOptions();
  };

  private generatePresetValues(width: number, height: number) {
    for (const preset of sizePresets) {
      this.presetWidths[preset] = Math.round(width * preset);
      this.presetHeights[preset] = Math.round(height * preset);
    }
  }

  private getPreset(): number | string {
    const sizeMode = this.props.options.sizeMode || 'longest-side';
    if (sizeMode !== 'dimensions') return 'custom';
    const { width, height } = this.props.options;

    for (const preset of sizePresets) {
      if (
        width === this.presetWidths[preset] &&
        height === this.presetHeights[preset]
      )
        return preset;
    }

    return 'custom';
  }

  private onPresetChange = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'custom') return;
    const multiplier = Number(select.value);
    (this.form!.width as HTMLInputElement).value =
      Math.round(this.props.inputWidth * multiplier) + '';
    (this.form!.height as HTMLInputElement).value =
      Math.round(this.props.inputHeight * multiplier) + '';
    this.reportOptions();
  };

  render({ options, isVector }: Props, { maintainAspect }: State) {
    const sizeMode = options.sizeMode || 'longest-side';
    return (
      <form
        ref={linkRef(this, 'form')}
        class={style.optionsSection}
        onSubmit={preventDefault}
      >
        <label class={style.optionTextFirst}>
          Method:
          <Select
            name="resizeMethod"
            value={options.method}
            onChange={this.onChange}
          >
            {isVector && <option value="vector">Vector</option>}
            <option value="lanczos3">Lanczos3</option>
            <option value="mitchell">Mitchell</option>
            <option value="catrom">Catmull-Rom</option>
            <option value="triangle">Triangle (bilinear)</option>
            <option value="hqx">hqx (pixel art)</option>
            <option value="browser-pixelated">Browser pixelated</option>
            <option value="browser-low">Browser low quality</option>
            <option value="browser-medium">Browser medium quality</option>
            <option value="browser-high">Browser high quality</option>
          </Select>
        </label>
        <label class={style.optionTextFirst}>
          Resize to:
          <Select name="sizeMode" value={sizeMode} onChange={this.onChange}>
            <option value="dimensions">Width &amp; height</option>
            <option value="longest-side">Long edge</option>
          </Select>
        </label>
        {sizeMode === 'dimensions' ? (
          <label class={style.optionTextFirst}>
            Preset:
            <Select value={this.getPreset()} onChange={this.onPresetChange}>
              {sizePresets.map((preset) => (
                <option value={preset}>{preset * 100}%</option>
              ))}
              <option value="custom">Custom</option>
            </Select>
          </label>
        ) : null}
        {sizeMode === 'dimensions' ? (
          <label class={style.optionTextFirst}>
            Width:
            <input
              required
              class={style.textField}
              name="width"
              type="number"
              min="1"
              value={'' + options.width}
              onInput={this.onWidthInput}
            />
          </label>
        ) : (
          <input name="width" type="hidden" value={'' + options.width} />
        )}
        {sizeMode === 'dimensions' ? (
          <label class={style.optionTextFirst}>
            Height:
            <input
              required
              class={style.textField}
              name="height"
              type="number"
              min="1"
              value={'' + options.height}
              onInput={this.onHeightInput}
            />
          </label>
        ) : (
          <input name="height" type="hidden" value={'' + options.height} />
        )}
        {sizeMode === 'longest-side' ? (
          <label class={style.optionTextFirst}>
            Long edge:
            <input
              required
              class={style.textField}
              name="longestSide"
              type="number"
              min="1"
              max="9999"
              value={'' + options.longestSide}
              onInput={this.onChange}
            />
          </label>
        ) : (
          <input
            name="longestSide"
            type="hidden"
            value={'' + options.longestSide}
          />
        )}
        <Expander>
          {isWorkerOptions(options) ? (
            <label class={style.optionToggle}>
              Premultiply alpha channel
              <Checkbox
                name="premultiply"
                checked={options.premultiply}
                onChange={this.onChange}
              />
            </label>
          ) : null}
          {isWorkerOptions(options) ? (
            <label class={style.optionToggle}>
              Linear RGB
              <Checkbox
                name="linearRGB"
                checked={options.linearRGB}
                onChange={this.onChange}
              />
            </label>
          ) : null}
        </Expander>
        {sizeMode === 'dimensions' ? (
          <label class={style.optionToggle}>
            Maintain aspect ratio
            <Checkbox
              name="maintainAspect"
              checked={maintainAspect}
              onChange={linkState(this, 'maintainAspect')}
            />
          </label>
        ) : null}
        {sizeMode === 'dimensions' ? (
          <Expander>
            {maintainAspect ? null : (
              <label class={style.optionTextFirst}>
                Fit method:
                <Select
                  name="fitMethod"
                  value={options.fitMethod}
                  onChange={this.onChange}
                >
                  <option value="stretch">Stretch</option>
                  <option value="contain">Contain</option>
                </Select>
              </label>
            )}
          </Expander>
        ) : null}
      </form>
    );
  }
}
