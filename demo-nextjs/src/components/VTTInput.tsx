import { CloseIcon, ResetIcon, UploadIcon } from '@sanity/icons'
import {
  Box,
  Button,
  Card,
  Heading,
  Label,
  Menu,
  MenuButton,
  Stack,
  Text,
  useToast,
} from '@sanity/ui'
import { customAlphabet } from 'nanoid'
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ArrayOfObjectsInputProps, defineField, set, unset } from 'sanity'
import { Cue, formatTimestamp, NodeHeader, parseSync } from 'subtitle'

export const generateItemKey = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  12,
)

type StoredNode = { _key: string } & (
  | {
      _type: 'vtt.header'
      _key: string
      text: NodeHeader['data']
    }
  | {
      _type: 'vtt.cue'
      _key: string
      text: Cue['text']
      cueStart: Cue['start']
      cueEnd: Cue['end']
      cueSettings: Cue['settings']
    }
)

const VTTDisplay = ({ value: parsedVtt }: { value: StoredNode[] }) => {
  return (
    <Card
      tone="transparent"
      paddingX={3}
      paddingY={4}
      border
      radius={1}
      style={{
        maxHeight: '50vh',
        overflowY: 'auto',
      }}
    >
      <Stack space={4}>
        {parsedVtt.map((node) => (
          <Box key={node._key}>
            {node._type === 'vtt.header' && (
              <Heading size={1}>{node.text}</Heading>
            )}
            {node._type === 'vtt.cue' && (
              <Stack space={2}>
                {typeof node.cueStart === 'number' &&
                  typeof node.cueEnd === 'number' && (
                    <Label muted>
                      {formatTimestamp(node.cueStart)} -{' '}
                      {formatTimestamp(node.cueEnd)}
                    </Label>
                  )}
                <Text>{node.text}</Text>
              </Stack>
            )}
          </Box>
        ))}
      </Stack>
    </Card>
  )
}

function stringToNodes(vttString: string): StoredNode[] {
  const parsedVtt = parseSync(vttString)
  return parsedVtt.map((node) => {
    const base = { _key: generateItemKey() }

    if (node.type === 'header')
      return {
        ...base,
        _type: 'vtt.header',
        text: node.data,
      }

    return {
      ...base,
      _type: 'vtt.cue',
      text: node.data.text,
      cueStart: node.data.start,
      cueEnd: node.data.end,
      cueSettings: node.data.settings,
    }
  })
}

const FileUpload = React.forwardRef<
  any,
  {
    setValue: (newValue: StoredNode[]) => void
    inputId: string
  }
>(function FileUpload({ setValue: setVttContents, inputId }, ref) {
  const toast = useToast()

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (/\.(vtt)$/i.test(file.name)) {
        const reader = new FileReader()
        reader.onload = () => {
          let captions = reader.result as string
          try {
            setVttContents(stringToNodes(captions))
          } catch (error) {
            toast.push({
              status: 'error',
              title: 'Error parsing VTT file',
              description:
                'message' in error
                  ? error.message
                  : "Make sure it's a valid VTT file",
            })
          }
        }

        reader.readAsText(file)
      }
      // Do something with the files
    },
    [setVttContents, toast],
  )

  const dropzone = useDropzone({
    onDrop,
    accept: {
      'text/vtt': ['.vtt', 'vtt'],
    },
    multiple: false,
  })
  const {
    inputRef,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept,
  } = dropzone

  const rootProps = getRootProps()

  // By default, Sanity's dialogs will capture drag/drop events, breaking the dropzone.
  // So for UploadBox inside arrays, we need to capture these events first, hence the duplication
  // of handlers in their captured version.
  const adjustedRootProps: typeof rootProps = {
    ...rootProps,
    onDragEnterCapture: (e) => {
      rootProps.onDragEnter?.(e)
    },
    onDragLeaveCapture: (e) => {
      rootProps.onDragLeave?.(e)
    },
    onDragOverCapture: (e) => {
      rootProps.onDragOver?.(e)
    },
    onDropCapture: (e) => {
      rootProps.onDrop?.(e)
    },
  }

  return (
    <Card
      {...adjustedRootProps}
      padding={4}
      border
      display="flex"
      tone={isDragReject ? 'critical' : isDragAccept ? 'positive' : 'default'}
      style={{
        minHeight: '300px',
        borderStyle: isDragActive ? 'dashed' : 'solid',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <input ref={inputRef} id={inputId} {...getInputProps()} />

      <Stack space={3}>
        {!isDragActive && (
          <UploadIcon style={{ margin: '0 auto' }} fontSize={40} />
        )}
        <Text weight="bold" muted={isDragActive}>
          {isDragActive
            ? 'Drop to upload'
            : 'Drag a .vtt subtitles file or click here'}
        </Text>
      </Stack>
    </Card>
  )
})

const VTTInput = React.forwardRef<any, ArrayOfObjectsInputProps<StoredNode>>(
  function VTTInput(props, ref) {
    const clearSelection = () => props.onChange(unset())
    const setValue = (contents: StoredNode[]): void =>
      props.onChange(set(contents))

    if (!props.value) {
      return (
        <FileUpload
          setValue={setValue}
          ref={ref}
          inputId={`${props.id}-file`}
        />
      )
    }

    return (
      <Stack space={2}>
        <VTTDisplay value={props.value} />
        <MenuButton
          ref={ref}
          button={
            <Button
              text="Clear selection"
              icon={CloseIcon}
              mode="ghost"
              tone="critical"
            />
          }
          id={`${props.id}-clear-menu`}
          popover={{ portal: true, tone: 'default' }}
          menu={
            <Menu padding={3}>
              <Stack space={3}>
                <Text>Are you sure you want to delete these subtitles?</Text>
                <Button
                  text="Clear field"
                  icon={ResetIcon}
                  mode="ghost"
                  tone="critical"
                  onClick={clearSelection}
                />
              </Stack>
            </Menu>
          }
        />
      </Stack>
    )
  },
)

export const vttField = defineField({
  title: 'Video Subtitles',
  name: 'vtt',
  type: 'array',
  of: [
    defineField({
      name: 'vtt.header',
      title: 'VTT Header',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Header content',
          type: 'string',
        },
      ],
    }),
    defineField({
      name: 'vtt.cue',
      title: 'VTT Cue',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Cue content',
          type: 'string',
        },
        {
          name: 'cueStart',
          title: 'Start time (ms)',
          type: 'number',
        },
        {
          name: 'cueEnd',
          title: 'End time (ms)',
          type: 'number',
        },
        {
          name: 'cueSettings',
          title: 'Cue settings',
          type: 'string',
        },
      ],
    }),
  ],
  components: {
    input: VTTInput,
  },
})
