type PreviewBadgeProps = {
  type: string
}

export function PreviewBadge(props: PreviewBadgeProps) {
  return <span className='preview-badge'>{props.type.toUpperCase()}</span>
}
