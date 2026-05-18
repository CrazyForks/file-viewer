public final class PreviewFile {
    private final String name;

    public PreviewFile(String name) {
        this.name = name;
    }

    public String extension() {
        int index = name.lastIndexOf('.');
        return index >= 0 ? name.substring(index + 1).toLowerCase() : "";
    }
}
