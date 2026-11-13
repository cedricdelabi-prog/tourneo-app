package com.cedricdelabi.tourneo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TourneoNativeConfig")
public class TourneoNativeConfigPlugin extends Plugin {
    @PluginMethod
    public void pushConfig(PluginCall call) {
        int key = getContext().getResources().getIdentifier("project_id", "string", getContext().getPackageName());
        String project = key == 0 ? "" : getContext().getString(key);
        JSObject result = new JSObject();
        result.put("configured", !project.isEmpty());
        result.put("project", project);
        call.resolve(result);
    }
}
