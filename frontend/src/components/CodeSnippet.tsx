import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Highlight, Prism, type Language, type PrismTheme } from 'prism-react-renderer'
import BrandAssetIcon from './BrandAssetIcon'

const oneDarkProTheme: PrismTheme = {
  plain: {
    backgroundColor: 'transparent',
    color: '#abb2bf',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#5c6370', fontStyle: 'italic' },
    },
    {
      types: ['punctuation', 'operator'],
      style: { color: '#56b6c2' },
    },
    {
      types: ['builtin', 'keyword', 'important', 'selector', 'atrule'],
      style: { color: '#c678dd' },
    },
    {
      types: ['property', 'tag', 'constant', 'symbol', 'deleted'],
      style: { color: '#e06c75' },
    },
    {
      types: ['boolean', 'number', 'inserted'],
      style: { color: '#d19a66' },
    },
    {
      types: ['string', 'char', 'attr-value', 'regex'],
      style: { color: '#98c379' },
    },
    {
      types: ['function', 'class-name'],
      style: { color: '#61afef' },
    },
  ],
}

type CodeSnippetProps = {
  code: string
  copied: boolean
  iconAlt: string
  iconSrc: string
  label: string
  language: Language
  onCopy: () => void
}

function trimTrailingEmptyLine(code: string) {
  return code.trim().replace(/\n+$/u, '')
}

function CodeSnippet({
  code,
  copied,
  iconAlt,
  iconSrc,
  label,
  language,
  onCopy,
}: CodeSnippetProps) {
  const codeToRender = trimTrailingEmptyLine(code)

  return (
    <Paper className="code-snippet" elevation={0}>
      <Stack
        alignItems={{ xs: 'stretch', sm: 'center' }}
        className="code-snippet__header"
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1.25}
      >
        <Stack alignItems="center" className="code-snippet__meta" direction="row" spacing={1}>
          <BrandAssetIcon alt={iconAlt} className="code-snippet__icon" size={22} src={iconSrc} />
          <Box sx={{ minWidth: 0 }}>
            <Typography className="code-snippet__label" variant="body2">
              {label}
            </Typography>
            <Typography className="code-snippet__hint" variant="caption">
              {language.toUpperCase()}
            </Typography>
          </Box>
        </Stack>

        <Button
          className="code-snippet__copy"
          onClick={onCopy}
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          variant="text"
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Stack>

      <Highlight code={codeToRender} language={language} prism={Prism} theme={oneDarkProTheme}>
        {({ className, getLineProps, getTokenProps, style, tokens }) => (
          <Box className="code-snippet__scroll">
            <pre className={`code-snippet__pre ${className}`} style={style}>
              {tokens.map((line, lineIndex) => {
                if (lineIndex === tokens.length - 1 && line.length === 1 && line[0]?.empty) {
                  return null
                }

                return (
                  <div
                    key={`${language}-${lineIndex}`}
                    {...getLineProps({
                      line,
                      style: { display: 'block' },
                    })}
                  >
                    {line.map((token, tokenIndex) => (
                      <span
                        key={`${language}-${lineIndex}-${tokenIndex}`}
                        {...getTokenProps({ token })}
                      />
                    ))}
                  </div>
                )
              })}
            </pre>
          </Box>
        )}
      </Highlight>
    </Paper>
  )
}

export default CodeSnippet
