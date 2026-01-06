import { h, Component, Fragment } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import 'shared/custom-els/loading-spinner';
import { SourceImage } from '../';
import prettyBytes from './pretty-bytes';
import { Arrow, DownloadIcon } from 'client/lazy-app/icons';

interface Props {
  loading: boolean;
  source?: SourceImage;
  imageFile?: File;
  downloadUrl?: string;
  flipSide: boolean;
  typeLabel: string;
  isMultiDownload?: boolean;
  onDownloadClick?: () => Promise<void> | void;
  downloadName?: string;
  showSnack?: (
    message: string,
    options?: { timeout?: number },
  ) => Promise<string>;
}

interface State {
  showLoadingState: boolean;
  isDownloading: boolean;
}

const loadingReactionDelay = 500;

const MultiDownloadIcon = () => (
  <svg viewBox="0 0 36 36" aria-hidden="true">
    <path d="M9.8,10.3h-1.2v13.2h2.7c1.5,0,2.7,1.2,2.7,2.7h0c0,1.4,1.2,2.5,2.6,2.6h2.7c1.4,0,2.5-1.2,2.6-2.6,0-1.5,1.2-2.7,2.7-2.7h2.6v-13.2h-1.2c-.7,0-1.4-.6-1.4-1.4s.6-1.4,1.4-1.4h1.2c1.5,0,2.7,1.1,2.8,2.6,0,0,0,0,0,.1v18.5c0,1.5-1.2,2.7-2.7,2.7H8.7c-1.5,0-2.7-1.2-2.7-2.7h0V10.3c0-1.5,1.2-2.7,2.7-2.7h1.2c.7,0,1.4.6,1.4,1.4s-.6,1.4-1.4,1.4h0Z" />
    <path d="M16.9,21.2v-6.9c0-.6.5-1.1,1.1-1.1s1.1.5,1.1,1.1v6.9l1.3-1.3c.4-.4,1-.4,1.5,0,.4.4.4,1,0,1.5l-3.1,3.1c-.4.4-1,.4-1.4,0,0,0,0,0,0,0l-3.1-3.1c-.4-.4-.4-1.1,0-1.5.4-.4,1.1-.4,1.5,0l1.3,1.3Z" />
    <path d="M12.3,12.5v-6.9c0-.6.5-1.1,1.1-1.1s1.1.5,1.1,1.1v6.9l1.3-1.3c.4-.4,1-.4,1.5,0,.4.4.4,1,0,1.5l-3.1,3.1c-.4.4-1,.4-1.4,0,0,0,0,0,0,0l-3.1-3.1c-.4-.4-.4-1.1,0-1.5.4-.4,1.1-.4,1.5,0l1.3,1.3Z" />
    <path d="M21.5,12.5v-6.9c0-.6.5-1.1,1.1-1.1s1.1.5,1.1,1.1v6.9l1.3-1.3c.4-.4,1-.4,1.5,0,.4.4.4,1,0,1.5l-3.1,3.1c-.4.4-1,.4-1.4,0,0,0,0,0,0,0l-3.1-3.1c-.4-.4-.4-1.1,0-1.5.4-.4,1.1-.4,1.5,0l1.3,1.3Z" />
  </svg>
);

export default class Results extends Component<Props, State> {
  state: State = {
    showLoadingState: this.props.loading,
    isDownloading: false,
  };

  /** The timeout ID between entering the loading state, and changing UI */
  private loadingTimeoutId: number = 0;

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.loading && !this.props.loading) {
      // Just stopped loading
      clearTimeout(this.loadingTimeoutId);
      this.setState({ showLoadingState: false });
    } else if (!prevProps.loading && this.props.loading) {
      // Just started loading
      this.loadingTimeoutId = self.setTimeout(
        () => this.setState({ showLoadingState: true }),
        loadingReactionDelay,
      );
    }
  }

  private onDownload = async (event: Event) => {
    if (this.state.showLoadingState || this.state.isDownloading) {
      event.preventDefault();
      return;
    }

    if (this.props.onDownloadClick) {
      event.preventDefault();
      this.setState({ isDownloading: true });
      try {
        await this.props.onDownloadClick();
      } finally {
        this.setState({ isDownloading: false });
      }
      return;
    }

    if (
      !this.props.downloadUrl ||
      !this.props.imageFile ||
      !this.props.source
    ) {
      event.preventDefault();
      return;
    }

    this.setState({ isDownloading: true });

    // GA can’t do floats. So we round to ints. We're deliberately rounding to nearest kilobyte to
    // avoid cases where exact image sizes leak something interesting about the user.
    const before = Math.round(this.props.source!.file.size / 1024);
    const after = Math.round(this.props.imageFile!.size / 1024);
    const change = Math.round((after / before) * 1000);

    ga('send', 'event', 'compression', 'download', {
      metric1: before,
      metric2: after,
      metric3: change,
    });

    if (this.props.showSnack) {
      // Use a short delay so the UI can show the spinner before the snackbar appears.
      setTimeout(() => {
        this.props.showSnack!('Download completed', { timeout: 1500 }).catch(
          () => undefined,
        );
        this.setState({ isDownloading: false });
      }, 200);
      return;
    }

    this.setState({ isDownloading: false });
  };

  render(
    {
      source,
      imageFile,
      downloadUrl,
      flipSide,
      typeLabel,
      isMultiDownload,
      downloadName,
    }: Props,
    { showLoadingState, isDownloading }: State,
  ) {
    const prettySize = imageFile && prettyBytes(imageFile.size);
    const isOriginal = !source || !imageFile || source.file === imageFile;
    let diff;
    let percent;

    if (source && imageFile) {
      diff = imageFile.size / source.file.size;
      const absolutePercent = Math.round(Math.abs(diff) * 100);
      percent = diff > 1 ? absolutePercent - 100 : 100 - absolutePercent;
    }

    const downloadClass = [
      showLoadingState || isDownloading
        ? style.downloadDisable
        : style.download,
      isMultiDownload ? style.downloadMulti : style.downloadSingle,
    ].join(' ');

    return (
      <div
        class={
          (flipSide ? style.resultsRight : style.resultsLeft) +
          ' ' +
          (isOriginal ? style.isOriginal : '')
        }
      >
        <div class={style.expandArrow}>
          <Arrow />
        </div>
        <div class={style.bubble}>
          <div class={style.bubbleInner}>
            <div class={style.sizeInfo}>
              <div class={style.fileSize}>
                {prettySize ? (
                  <Fragment>
                    {prettySize.value}{' '}
                    <span class={style.unit}>{prettySize.unit}</span>
                    <span class={style.typeLabel}> {typeLabel}</span>
                  </Fragment>
                ) : (
                  '…'
                )}
              </div>
            </div>
            <div class={style.percentInfo}>
              <svg
                viewBox="0 0 1 2"
                class={style.bigArrow}
                preserveAspectRatio="none"
              >
                <path d="M1 0v2L0 1z" />
              </svg>
              <div class={style.percentOutput}>
                {diff && diff !== 1 && (
                  <span class={style.sizeDirection}>
                    {diff < 1 ? '↓' : '↑'}
                  </span>
                )}
                <span class={style.sizeValue}>{percent || 0}</span>
                <span class={style.percentChar}>%</span>
              </div>
            </div>
          </div>
        </div>
        <a
          class={downloadClass}
          href={downloadUrl}
          download={downloadName || (imageFile ? imageFile.name : '')}
          title={isMultiDownload ? 'Download all files' : 'Download file'}
          aria-disabled={showLoadingState || isDownloading}
          onClick={this.onDownload}
        >
          <svg class={style.downloadBlobs} viewBox="0 0 89.6 86.9">
            <title>
              {isMultiDownload ? 'Download all files' : 'Download file'}
            </title>
            <path d="M27.3 72c-8-4-15.6-12.3-16.9-21-1.2-8.7 4-17.8 10.5-26s14.4-15.6 24-16 21.2 6 28.6 16.5c7.4 10.5 10.8 25 6.6 34S64.1 71.8 54 73.6c-10.2 2-18.7 2.3-26.7-1.6z" />
            <path d="M19.8 24.8c4.3-7.8 13-15 21.8-15.7 8.7-.8 17.5 4.8 25.4 11.8 7.8 6.9 14.8 15.2 14.7 24.9s-7.1 20.7-18 27.6c-10.8 6.8-25.5 9.5-34.2 4.8S18.1 61.6 16.7 51.4c-1.3-10.3-1.3-18.8 3-26.6z" />
          </svg>
          <div class={style.downloadIcon}>
            {isMultiDownload ? <MultiDownloadIcon /> : <DownloadIcon />}
          </div>
          {(showLoadingState || isDownloading) && <loading-spinner />}
        </a>
      </div>
    );
  }
}
